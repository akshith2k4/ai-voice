export function fireAndForget(promise: any): void {
  Promise.resolve(promise).catch(err => console.error("[Observability] Background task failed:", err));
}
