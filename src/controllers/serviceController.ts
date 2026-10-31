import { Request, Response } from "express";
import {
  addService,
  archiveService,
  editService,
  findServices,
} from "../services/serviceService";

export async function listServices(req: Request, res: Response) {
  const services = await findServices(req.member!.businessId);
  res.json({ services });
}

export async function createService(req: Request, res: Response) {
  const service = await addService(req.member!.businessId, req.body);
  res.status(201).json({ service });
}

export async function getService(req: Request, res: Response) {
  const {
    id,
    name,
    description,
    durationMinutes,
    priceCents,
    isActive,
    createdAt,
  } = req.service!;
  res.json({
    service: {
      id,
      name,
      description,
      durationMinutes,
      priceCents,
      isActive,
      createdAt,
    },
  });
}

export async function updateService(req: Request, res: Response) {
  const service = await editService(req.service!.id, req.body);
  res.json({ service });
}

export async function deleteService(req: Request, res: Response) {
  await archiveService(req.service!.id);
  res.status(204).send();
}
