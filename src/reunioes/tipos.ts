export interface SecaoReuniao {
  id: string;
  titulo: string;
  texto: string;
}
export interface ConteudoReuniao {
  secoes: SecaoReuniao[];
  duvidas: Array<{ pergunta: string; resposta: string }>;
}
export interface ResumoReuniao {
  id: string;
  slug: string;
  titulo: string;
  cliente: string;
  data: string;
}
export interface Reuniao extends ResumoReuniao {
  compartilhado: ConteudoReuniao;
  interno?: ConteudoReuniao;
}
export interface Transcricao {
  texto: string;
  fonte_url: string;
  lida_em: string;
}
export interface Anotacao {
  id: string;
  reuniao_id: string;
  secao: string;
  visibilidade: 'interno' | 'compartilhado';
  tipo: 'anotacao' | 'decisao' | 'acao';
  texto: string;
  autor_nome: string;
  criado_em: string;
}
export interface Convite {
  email: string;
  expira_em: string;
  ativo: boolean;
}
export interface IdentidadeReunioes {
  id: string;
  email: string;
  nome: string;
  equipe: boolean;
}
