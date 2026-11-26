import Iyzipay from "iyzipay";
import { AppError } from "../errors/AppError";
import { iyzico, iyzicoCall } from "../lib/iyzico";
import { prisma } from "../lib/prisma";
import { env } from "../config/env";
import { AppointmentStatus, PaymentStatus } from "@prisma/client";
import { string } from "zod";
import { generateToken, hashToken } from "../lib/token";
import { notifyBooked } from "./appointmentEmailService";

type InitializeResult = {
  status: string;
  errorCode?: string;
  errorMessage?: string;
  token?: string;
  paymentPageUrl: string;
};

export async function startCheckout(appointmentId: string, ip: string) {
  if (!iyzico) {
    throw new AppError(
      503,
      "Online payments are not configured",
      "PAYMENTS_DISABLED",
    );
  }
  const client = iyzico;

  const appointment = await prisma.appointment.findUniqueOrThrow({
    where: { id: appointmentId },
    select: {
      id: true,
      customerName: true,
      customerEmail: true,
      service: { select: { name: true } },
      payment: { select: { id: true, amountCents: true } },
    },
  });

  if (!appointment.payment) {
    throw new Error("Appointment has no payment record");
  }

  const price = (appointment.payment.amountCents / 100).toFixed(2);
  const [name, ...rest] = appointment.customerName.trim().split(" ");
  const surname = rest.join(" ") || name;
  const address = {
    contactName: appointment.customerName,
    city: "Istanbul",
    country: "Turkey",
    address: "Online randevu",
  };

  let result: InitializeResult;
  try {
    result = await iyzicoCall<InitializeResult>((done) =>
      client.checkoutFormInitialize.create(
        {
          locale: Iyzipay.LOCALE.TR,
          conversationId: appointment.payment!.id,
          price,
          paidPrice: price,
          currency: Iyzipay.CURRENCY.TRY,
          basketId: appointment.id,
          paymentGroup: Iyzipay.PAYMENT_GROUP.PRODUCT,
          callbackUrl: `${env.API_PUBLIC_URL}/payments/iyzico/callback`,
          enabledInstallments: [1],
          buyer: {
            id: appointment.id,
            name,
            surname,
            email: appointment.customerEmail,
            identityNumber: "11111111111",
            registrationAddress: address.address,
            ip,
            city: address.city,
            country: address.country,
          },
          shippingAddress: address,
          billingAddress: address,
          basketItems: [
            {
              id: appointment.id,
              name: appointment.service.name,
              category1: "Randevu",
              itemType: Iyzipay.BASKET_ITEM_TYPE.VIRTUAL,
              price,
            },
          ],
        },
        done,
      ),
    );
  } catch (err) {
    console.error("[payment] iyzico request failed", err);
    throw new AppError(
      502,
      "Payment provider unavailable",
      "PAYMENT_UNAVAILABLE",
    );
  }
  if (result.status !== "success" || !result.token || !result.paymentPageUrl) {
    console.error(
      "[payment] iyzico rejected checkout",
      result.errorCode,
      result.errorMessage,
    );
    throw new AppError(
      502,
      "Payment provider rejected the request",
      "PAYMENT_INIT_FAILED",
    );
  }
  await prisma.payment.update({
    where: { id: appointment.payment.id },
    data: { providerToken: result.token },
  });

  return { paymentPageUrl: result.paymentPageUrl };
}

export async function releaseFailedCheckout(
  appointmentId: string,
  paymentId: string,
  reason: string,
) {
  await prisma.$transaction([
    prisma.appointment.updateMany({
      where: { id: appointmentId, status: AppointmentStatus.PENDING_PAYMENT },
      data: { status: AppointmentStatus.CANCELLED, cancelledAt: new Date() },
    }),
    prisma.payment.update({
      where: { id: paymentId },
      data: { status: PaymentStatus.FAILED, failureReason: reason },
    }),
  ]);
}

type RetrieveResult = {
  status: string;
  paymentStatus?: string;
  paymentId?: string | number;
  conversationId?: string;
  basketId?: string;
  paidPrice?: string | number;
  errorMessage: string;
};

export type CallbackOutcome = {
  outcome: "success" | "failed" | "late" | "error";
  appointmentId?: string;
};

export async function handleCheckoutCallback(
  token: string | undefined,
  now: Date = new Date(),
): Promise<CallbackOutcome> {
  if (!token) return { outcome: "error" };

  const payment = await prisma.payment.findUnique({
    where: { providerToken: token },
  });
  if (!payment) return { outcome: "error" };

  const appointmentId = payment.appointmentId;

  if (payment.status === PaymentStatus.PAID) {
    return {
      outcome: payment.failureReason ? "late" : "success",
      appointmentId,
    };
  }

  if (payment.status === PaymentStatus.FAILED) {
    return { outcome: "failed", appointmentId };
  }

  if (!iyzico) {
    throw new AppError(
      503,
      "Online payments are not configured",
      "PAYMENTS_DISABLED",
    );
  }
  const client = iyzico;

  let result: RetrieveResult;
  try {
    result = await iyzicoCall<RetrieveResult>((done) =>
      client.checkoutForm.retrieve(
        {
          locale: Iyzipay.LOCALE.TR,
          conversationId: payment.id,
          token,
        },
        done,
      ),
    );
  } catch (err) {
    console.error("[payment] iyzico retrieve failed", err);
    throw new AppError(
      502,
      "Payment provider unavailable",
      "PAYMENT_UNAVAILABLE",
    );
  }

  const paid =
    result.status === "success" && result.paymentStatus === "SUCCESS";

  if (!paid) {
    await releaseFailedCheckout(
      appointmentId,
      payment.id,
      result.errorMessage ?? "payment failed",
    );
    return { outcome: "failed", appointmentId };
  }

  const paidCents = Math.round(Number(result.paidPrice) * 100);
  const sameConversation = result.conversationId === payment.id;
  const sameBasket = result.basketId === appointmentId;
  const sameAmount = paidCents === payment.amountCents;

  if (!sameConversation || !sameBasket || !sameAmount) {
    console.error(`[payment] verification mismatch for payment ${payment.id}`, {
      sameConversation,
      sameBasket,
      sameAmount,
      paidCents,
      expectedCents: payment.amountCents,
    });
    return { outcome: "error", appointmentId };
  }

  const manageToken = generateToken();

  const state = await prisma.$transaction(async (tx) => {
    const claimed = await tx.payment.updateMany({
      where: { id: payment.id, status: PaymentStatus.PENDING },
      data: {
        status: PaymentStatus.PAID,
        paidAt: now,
        providerPaymentId: result.paymentId
          ? String(result.paymentId)
          : undefined,
      },
    });

    if (claimed.count !== 1) return "allready" as const;

    const activated = await tx.appointment.updateMany({
      where: { id: appointmentId, status: AppointmentStatus.PENDING_PAYMENT },
      data: {
        status: AppointmentStatus.CONFIRMED,
        holdExpiresAt: null,
        manageTokenHash: hashToken(manageToken),
      },
    });

    if (activated.count !== 1) {
      await tx.payment.update({
        where: { id: payment.id },
        data: { failureReason: "PAID_AFTER_CANCELLATION" },
      });
      return "late" as const;
    }

    return "confirmed" as const;
  });

  if (state === "confirmed") {
    await notifyBooked(appointmentId, manageToken);
    return { outcome: "success", appointmentId };
  }

  if (state === "late") {
    console.error(
      `[payment] payment ${payment.id} was paid after appointment ${appointmentId} was released, refund needed`,
    );
    return { outcome: "late", appointmentId };
  }

  const fresh = await prisma.payment.findUniqueOrThrow({
    where: { id: payment.id },
  });
  return { outcome: fresh.failureReason ? "late" : "success", appointmentId };
}
