import { NextResponse } from "next/server";
import {
  getPartnerCompanyList,
  addPartnerCompany,
  deletePartnerCompany,
  savePartnerCompanyList,
} from "@/lib/partner-companies";

export async function GET() {
  try {
    const partnerCompanies = await getPartnerCompanyList();
    const companyNames = partnerCompanies.map((c) => c.name);
    return NextResponse.json({
      success: true,
      companies: companyNames,
      partnerCompanies,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to load partner companies" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, company, name, contact_person, contact_phone, contact_email, notes, id } = body;

    if (action === "delete") {
      const target = id || name || company;
      if (!target) {
        return NextResponse.json(
          { error: "Partner company ID or name required to delete" },
          { status: 400 }
        );
      }
      const updated = await deletePartnerCompany(String(target));
      return NextResponse.json({
        success: true,
        message: "Partner company deleted successfully",
        companies: updated.map((c) => c.name),
        partnerCompanies: updated,
      });
    }

    if (action === "save_all" && Array.isArray(body.companies)) {
      const updated = await savePartnerCompanyList(body.companies);
      return NextResponse.json({
        success: true,
        companies: updated.map((c) => c.name),
        partnerCompanies: updated,
      });
    }

    // Default: Add or update company
    const companyData =
      typeof company === "object" && company !== null
        ? company
        : {
            name: name || company,
            contact_person,
            contact_phone,
            contact_email,
            notes,
          };

    if (!companyData.name || !String(companyData.name).trim()) {
      return NextResponse.json(
        { error: "Partner company name is required" },
        { status: 400 }
      );
    }

    const updated = await addPartnerCompany(companyData);
    return NextResponse.json({
      success: true,
      message: "Partner company saved successfully",
      companies: updated.map((c) => c.name),
      partnerCompanies: updated,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to update partner companies" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    const name = url.searchParams.get("name");

    let target = id || name;
    if (!target) {
      try {
        const body = await request.json();
        target = body?.id || body?.name;
      } catch {
        // empty body
      }
    }

    if (!target) {
      return NextResponse.json(
        { error: "Partner company ID or name is required for deletion" },
        { status: 400 }
      );
    }

    const updated = await deletePartnerCompany(String(target));
    return NextResponse.json({
      success: true,
      message: `Partner company "${target}" deleted successfully`,
      companies: updated.map((c) => c.name),
      partnerCompanies: updated,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Failed to delete partner company" },
      { status: 500 }
    );
  }
}
