import Iyzipay from "iyzipay";
import { AppError } from "../errors/AppError";
import { iyzico, iyzicoCall } from "../lib/iyzico";
import { prisma } from "../lib/prisma";
import { env } from "../config/env";
import { AppointmentStatus, PaymentStatus } from "@prisma/client";

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
        } as unknown as Parameters<
          typeof client.checkoutFormInitialize.create
        >[0],
        (err, response) => {
          done(err, response as unknown as InitializeResult);
        },
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
