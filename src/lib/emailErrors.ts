export class EmailSendError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number | null,
  ) {
    super(message);
    this.name = "EmailSendError";
  }
}

export function isPermanentEmailFailure(statusCode: number | null): boolean {
  return (
    statusCode !== null &&
    statusCode >= 400 &&
    statusCode < 500 &&
    statusCode !== 429
  );
}
