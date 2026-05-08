export const dynamic = "force-dynamic";

import { google } from "googleapis";

export async function GET() {
  try {
    // 1. Ambil private key
    const privateKeyRaw = process.env.GOOGLE_PRIVATE_KEY || "";

    // 2. Normalisasi key (INI KRUSIAL untuk Vercel)
    const privateKey = privateKeyRaw
      .replace(/\\n/g, "\n")
      .replace(/\r/g, "")
      .trim();

    // 3. Auth JWT (lebih stabil dibanding GoogleAuth wrapper)
    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: privateKey,
      scopes: [
        "https://www.googleapis.com/auth/spreadsheets.readonly",
      ],
    });

    // 4. Init Google Sheets
    const sheets = google.sheets({ version: "v4", auth });

    // 5. Ambil data dari sheet
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: "data_query!A:Z",
    });

    const rows = response.data.values || [];

    if (rows.length === 0) {
      return Response.json([]);
    }

    const headers = rows[0];

    // 6. Map data jadi JSON
    const data = rows.slice(1).map((row) => {
      return headers.reduce((obj: any, key: string, i: number) => {
        obj[key] = row[i] || "";
        return obj;
      }, {});
    });

    return Response.json(data);
  } catch (error: any) {
    console.error("API ERROR:", error);

    return Response.json(
      {
        error: error.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}