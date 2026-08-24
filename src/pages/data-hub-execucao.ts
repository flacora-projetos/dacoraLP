export function validarAceiteExecucao(status: number, corpo: any) {
  const data = corpo?.data;
  if (status !== 202 || data?.status !== 'accepted' || typeof data.occurrenceId !== 'string'
    || !/^[0-9a-f]{64}$/i.test(data.occurrenceId) || typeof data.exportKey !== 'string'
    || !/^[0-9a-f]{64}$/i.test(data.exportKey) || !Number.isInteger(data.workUnits) || data.workUnits < 1
    || typeof corpo?.requestId !== 'string' || !/^[0-9a-f]{64}$/i.test(corpo.requestId)) {
    throw new Error('O Data Hub não confirmou o aceite da execução.');
  }
  return { occurrenceId: data.occurrenceId as string, requestId: corpo.requestId as string };
}
