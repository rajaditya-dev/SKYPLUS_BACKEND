import express from "express";
import sql from "mssql";

const router = express.Router();

/**
 * GET /api/ui-fields-config
 * Maps dbo.UIFieldConfig_Road → frontend SimpleFieldDef
 */

router.get("/ui-fields-config", async (_req, res) => {
  try {
    // const result = await sql.query(`
    //   SELECT
    //     Title,
    //     TechnicalName,
    //     Visible
    //   FROM dbo.UIFieldConfig_Road
    //   ORDER BY [Order]
    // `);

    // const mapped = result.recordset.map((r, idx) => ({
    //   title: r.Title,
    //   technicalName: r.TechnicalName,
    //   visibleInAdapt: r.Visible === true,
    //   order: idx + 1
    // }));


    const result = await sql.query(`
      SELECT
        Title,
        TechnicalName,
        Visible,
        VisibleInAdapt,
        [Order]
      FROM dbo.UIFieldConfig_Road
      ORDER BY [Order]
    `);

const mapped = result.recordset.map((r) => ({
  title: r.Title,
  technicalName: r.TechnicalName,
  visibleInAdapt: r.VisibleInAdapt === true,
  visible: r.Visible === true,
  order: r.Order
}));



    res.json(mapped);

  } catch (err) {
    console.error("UI Fields Config Error:", err);
    res.status(500).json({ error: "Failed to load UI field config" });
  }
});

export default router;