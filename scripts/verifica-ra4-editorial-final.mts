import assert from 'node:assert/strict';
import { compararSecoesRecusadas } from '../api/_painel-diff-secoes.ts';

const anterior = { leitura: { resumoExecutivo: [{ texto: 'A' }] }, montagem: [{ id: 'meta', titulo: 'Meta', faixa: 'meta_faixa' }], dados: { faixas: { meta_faixa: { numero: 1, metrica: 'resultado' } } } };
const mesmaEstruturaComOrdemDiferente = { dados: { faixas: { meta_faixa: { metrica: 'resultado', numero: 1 } } }, montagem: [{ titulo: 'Meta', faixa: 'meta_faixa', id: 'meta' }], leitura: { resumoExecutivo: [{ texto: 'A' }] } };
const alterada = { ...mesmaEstruturaComOrdemDiferente, dados: { faixas: { meta_faixa: { metrica: 'resultado', numero: 2 } } } };

assert.deepEqual(compararSecoesRecusadas(anterior, mesmaEstruturaComOrdemDiferente, ['introducao', 'bloco:meta'])?.map(item => item.estado), ['inalterada', 'inalterada']);
assert.equal(compararSecoesRecusadas(anterior, alterada, ['bloco:meta'])?.[0].estado, 'alterada');
assert.equal(compararSecoesRecusadas(anterior, { ...alterada, montagem: [] }, ['bloco:meta'])?.[0].estado, 'nao_comparavel');
assert.equal(compararSecoesRecusadas(null, alterada, ['bloco:meta']), null);
console.log('OK — RA4 final: diff estrutural estável, mudança factual e fonte insuficiente fail-closed.');
