export const dynamic = "force-dynamic";

import { google } from "googleapis";

export async function GET() {
  try {
    const privateKeyRaw = process.env.GOOGLE_PRIVATE_KEY || "";

    const privateKey = privateKeyRaw
      .replace(/\\n/g, "\n")
      .replace(/\r/g, "")
      .trim();

    const auth = new google.auth.JWT({
      email: process.env.GOOGLE_CLIENT_EMAIL,
      key: privateKey,
      scopes: [
        "https://www.googleapis.com/auth/spreadsheets.readonly",
      ],
    });

    const sheets = google.sheets({ version: "v4", auth });

    const response = await sheets.spreadsheets.values.batchGet({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      ranges: [
        "data_query!A:Z",
        "monitoring_um!A:J",
        "mutasi!A:Z",
      ],
    });

    const dataQueryRows =
      response.data.valueRanges?.[0]?.values || [];

    const monitoringUMRows =
      response.data.valueRanges?.[1]?.values || [];

    const mutasiRows =
      response.data.valueRanges?.[2]?.values || [];

    function sheetToJson(rows: any[][]) {
      if (!rows.length) return [];

      const headers = rows[0];

      return rows.slice(1).map((row) => {
        return headers.reduce((obj: any, key: string, i: number) => {
          obj[key] = row[i] || "";
          return obj;
        }, {});
      });
    }

    const dataQuery = sheetToJson(dataQueryRows);
    const monitoringUM = sheetToJson(monitoringUMRows);
    const mutasi = sheetToJson(mutasiRows);

    return Response.json({
      dataQuery,
      monitoringUM,
      mutasi,
    });
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