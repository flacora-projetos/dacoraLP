const PICKER_SCRIPT = 'https://apis.google.com/js/api.js';
const SHEETS_MIME_TYPE = 'application/vnd.google-apps.spreadsheet';

type GooglePickerNamespace = {
  Action: { PICKED: string; CANCEL: string };
  DocsView: new () => { setMimeTypes(value: string): unknown };
  PickerBuilder: new () => {
    addView(view: unknown): unknown;
    setOAuthToken(token: string): unknown;
    setDeveloperKey(key: string): unknown;
    setAppId(id: string): unknown;
    setCallback(callback: (data: any) => void): unknown;
    build(): { setVisible(visible: boolean): void };
  };
};

declare global {
  interface Window {
    gapi?: { load(name: string, options: { callback(): void; onerror(): void }): void };
    google?: { picker?: GooglePickerNamespace };
  }
}

let carregamento: Promise<void> | null = null;

function carregarPicker(): Promise<void> {
  if (window.google?.picker) return Promise.resolve();
  if (carregamento) return carregamento;
  carregamento = new Promise<void>((resolve, reject) => {
    const concluir = () => window.gapi?.load('picker', {
      callback: () => resolve(),
      onerror: () => reject(new Error('Não foi possível abrir o Google Drive. Tente novamente.')),
    });
    if (window.gapi) return concluir();
    const script = document.createElement('script');
    script.src = PICKER_SCRIPT;
    script.async = true;
    script.onload = concluir;
    script.onerror = () => reject(new Error('Não foi possível carregar o seletor do Google Drive.'));
    document.head.appendChild(script);
  }).catch((error) => {
    carregamento = null;
    throw error;
  });
  return carregamento;
}

export async function escolherPlanilhaGoogle(accessToken: string): Promise<string | null> {
  const apiKey = import.meta.env.VITE_DATA_HUB_GOOGLE_PICKER_API_KEY?.trim();
  const appId = import.meta.env.VITE_DATA_HUB_GOOGLE_PICKER_APP_ID?.trim();
  if (!accessToken || !apiKey || !appId) throw new Error('O seletor do Google Drive ainda não está configurado.');
  await carregarPicker();
  const picker = window.google?.picker;
  if (!picker) throw new Error('O seletor do Google Drive não ficou disponível.');
  return new Promise((resolve, reject) => {
    const view = new picker.DocsView();
    view.setMimeTypes(SHEETS_MIME_TYPE);
    const builder = new picker.PickerBuilder();
    builder.addView(view);
    builder.setOAuthToken(accessToken);
    builder.setDeveloperKey(apiKey);
    builder.setAppId(appId);
    builder.setCallback((data) => {
      if (data?.action === picker.Action.CANCEL) return resolve(null);
      if (data?.action !== picker.Action.PICKED) return;
      const spreadsheetId = data?.docs?.[0]?.id;
      if (typeof spreadsheetId !== 'string' || !spreadsheetId) return reject(new Error('O Google Drive não devolveu uma planilha válida.'));
      resolve(spreadsheetId);
    });
    builder.build().setVisible(true);
  });
}
