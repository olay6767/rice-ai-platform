"use client";

import { Database, LoaderCircle, RefreshCw } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import { DataTable, Notice, button, muted, panel, request, errorText } from "@/components/admin/dashboard/shared";
import type { AgriculturalType } from "@/lib/admin/agricultural-import";
import type { DashboardRow, DatasetColumn } from "@/lib/admin/dashboard-types";

type RecordsResponse = {
  rows: DashboardRow[];
  count: number;
  page: number;
  pageSize: number;
  provinces: Array<{ id: number; province_th: string }>;
};

const column = (key: string, label: string): DatasetColumn => ({
  key,
  label,
  help: "",
  required: false,
  example: "",
});

const COLUMNS: Record<AgriculturalType, readonly DatasetColumn[]> = {
  rice_price: [
    column("observed_on", "วันที่"),
    column("year", "ปี ค.ศ."),
    column("month", "เดือน"),
    column("rice_type", "ประเภทข้าว"),
    column("rice_type_code", "รหัสประเภทข้าว"),
    column("price", "ราคา"),
    column("unit", "หน่วย"),
    column("data_type", "ชนิดข้อมูล"),
    column("is_imputed", "ข้อมูลเติมค่า"),
    column("model_name", "ชื่อโมเดล"),
    column("model_version", "เวอร์ชันโมเดล"),
    column("forecast_date", "วันที่พยากรณ์"),
    column("reliability", "ความเชื่อมั่น"),
    column("reliability_label", "ระดับความเชื่อมั่น"),
    column("metadata", "ข้อมูลเพิ่มเติม"),
    column("source", "แหล่งข้อมูล"),
  ],
  flood: [
    column("year", "ปี ค.ศ."),
    column("month", "เดือน"),
    column("province_id", "จังหวัด"),
    column("flood_events", "เหตุการณ์น้ำท่วม"),
    column("affected_area_rai", "พื้นที่ได้รับผลกระทบ (ไร่)"),
    column("affected_households", "ครัวเรือนที่ได้รับผลกระทบ"),
    column("affected_people", "ผู้ได้รับผลกระทบ"),
    column("agricultural_damage_rai", "พื้นที่เกษตรเสียหาย (ไร่)"),
    column("source", "แหล่งข้อมูล"),
  ],
  drought: [
    column("year", "ปี ค.ศ."),
    column("month", "เดือน"),
    column("province_id", "จังหวัด"),
    column("drought_events", "เหตุการณ์ภัยแล้ง"),
    column("affected_area_rai", "พื้นที่ได้รับผลกระทบ (ไร่)"),
    column("affected_households", "ครัวเรือนที่ได้รับผลกระทบ"),
    column("agricultural_damage_rai", "พื้นที่เกษตรเสียหาย (ไร่)"),
    column("source", "แหล่งข้อมูล"),
  ],
  storm: [
    column("occurred_on", "วันที่เกิดเหตุ"),
    column("year", "ปี ค.ศ."),
    column("month", "เดือน"),
    column("province_id", "จังหวัด"),
    column("storm_type", "ประเภทพายุ"),
    column("storm_events", "จำนวนเหตุการณ์"),
    column("affected_people", "ผู้ได้รับผลกระทบ"),
    column("affected_households", "ครัวเรือนที่ได้รับผลกระทบ"),
    column("damaged_houses", "บ้านเสียหาย"),
    column("agricultural_damage_rai", "พื้นที่เกษตรเสียหาย (ไร่)"),
    column("source", "แหล่งข้อมูล"),
  ],
};

export default function GovernedDatasetRecords({
  type,
  versionId,
  versionLabel,
  revision,
}: {
  type: AgriculturalType;
  versionId: string;
  versionLabel: string;
  revision: number;
}) {
  const [result, setResult] = useState<RecordsResponse | null>(null);
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    const query = new URLSearchParams({
      mode: "records",
      type,
      versionId,
      page: String(page),
    });

    request<RecordsResponse>(`/api/admin/datasets?${query.toString()}`, { signal: controller.signal })
      .then((data) => {
        if (!controller.signal.aborted) setResult(data);
      })
      .catch((cause) => {
        if (!controller.signal.aborted) setError(errorText(cause));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [page, reload, revision, type, versionId]);

  const provinceNames = useMemo(
    () => new Map((result?.provinces ?? []).map((province) => [province.id, province.province_th])),
    [result?.provinces]
  );
  const pageSize = result?.pageSize ?? 25;
  const total = result?.count ?? 0;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const displayedPage = result?.page ?? page;

  function goToPage(nextPage: number) {
    setLoading(true);
    setError("");
    setPage(nextPage);
  }

  return (
    <section className={`${panel} space-y-4`} aria-labelledby="governed-records-title">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h4 id="governed-records-title" className="flex items-center gap-2 text-lg font-bold">
            <Database className="h-5 w-5 text-rice-leaf dark:text-rice-mint-light" />
            ตรวจข้อมูลในเวอร์ชันนี้
          </h4>
          <p className={`mt-1 ${muted}`}>เวอร์ชัน “{versionLabel}” · แสดงครั้งละ 25 แถว</p>
        </div>
        <button type="button" className={button} disabled={loading} onClick={() => {
          setLoading(true);
          setError("");
          setReload((value) => value + 1);
        }}>
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          รีเฟรชตาราง
        </button>
      </div>

      {error && <Notice error>{error}</Notice>}
      {loading && !result ? (
        <p className={`${muted} flex min-h-32 items-center justify-center`} role="status">
          <LoaderCircle className="mr-2 h-5 w-5 animate-spin" />กำลังโหลดข้อมูล…
        </p>
      ) : result ? (
        <>
          <DataTable rows={result.rows} columns={COLUMNS[type]} provinces={provinceNames} />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className={muted}>{total.toLocaleString("th-TH")} รายการ · หน้า {displayedPage.toLocaleString("th-TH")} / {pages.toLocaleString("th-TH")}</p>
            <div className="flex gap-2">
              <button type="button" className={button} disabled={loading || displayedPage <= 1} onClick={() => goToPage(displayedPage - 1)}>ก่อนหน้า</button>
              <button type="button" className={button} disabled={loading || displayedPage >= pages} onClick={() => goToPage(displayedPage + 1)}>ถัดไป</button>
            </div>
          </div>
        </>
      ) : null}
    </section>
  );
}
