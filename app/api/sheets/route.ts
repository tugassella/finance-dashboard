export const dynamic = "force-dynamic";

import { google } from "googleapis";

export async function GET() {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: "finsum-access@financial-summary-490502.iam.gserviceaccount.com",
        private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      },
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth });

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: "1-r17FdQcausazS1YfziTu-2IIgwAgtUdnv8sZyloKI8",
      range: "data_query!A:Z",
    });

    const rows = response.data.values || [];

    const headers = rows[0];

    const data = rows.slice(1).map((row) => {
      return headers.reduce((obj: any, key: string, i: number) => {
        obj[key] = row[i] || "";
        return obj;
      }, {});
    });

    return Response.json(data);

  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}