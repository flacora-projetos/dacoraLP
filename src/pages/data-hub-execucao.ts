export function validarAceiteExecucao(status: number, corpo: any) {
  const data = corpo?.data;
  const requestIdValido = typeof corpo?.requestId === 'string'
    && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(corpo.requestId);
  if (status !== 202 || data?.status !== 'accepted' || typeof data.occurrenceId !== 'string'
    || !/^[0-9a-f]{64}$/i.test(data.occurrenceId) || typeof data.exportKey !== 'string'
    || !/^[0-9a-f]{64}$/i.test(data.exportKey) || !Number.isInteger(data.workUnits) || data.workUnits < 1
    || !requestIdValido) {
    throw new Error('O Data Hub não confirmou o aceite da execução.');
  }
  return { occurrenceId: data.occurrenceId as string, requestId: corpo.requestId as string };
}
