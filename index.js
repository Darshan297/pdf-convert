import express from "express";
import multer from "multer";
import axios from "axios";
import FormData from "form-data";
import fs from "fs";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const upload = multer({ dest: "uploads/" });

/**
 * Convert PDF → Excel (XLSX) using Adobe API
 * Endpoint: POST /render/convert
 * Body: multipart/form-data with `file`
 */
app.post("/render/convert", upload.single("file"), async (req, res) => {
  try {
    const filePath = req.file.path;

    // Prepare form data for Adobe API
    const form = new FormData();
    form.append("file", fs.createReadStream(filePath), req.file.originalname);
    form.append("targetFormat", "xlsx");

    const response = await axios.post(
      "https://pdf-services.adobe.io/operation/exportpdf",
      form,
      {
        headers: {
          ...form.getHeaders(),
          Authorization: `Bearer ${process.env.ADOBE_ACCESS_TOKEN}`,
          "x-api-key": process.env.ADOBE_CLIENT_ID,
        },
        responseType: "arraybuffer", // ensure binary XLSX comes back
      }
    );

    // Send the XLSX file to client
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${req.file.originalname.replace(".pdf", ".xlsx")}"`
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.send(response.data);

    // Clean up uploaded file
    fs.unlinkSync(filePath);
  } catch (err) {
    console.error("❌ Conversion failed:", err.response?.data || err.message);
    res
      .status(500)
      .json({ error: "Conversion failed", details: err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`🚀 Server running at http://localhost:${PORT}`)
);
