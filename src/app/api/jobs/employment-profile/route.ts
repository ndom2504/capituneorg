import { NextResponse } from "next/server";

import {
  EmploymentAvailability,
  EmploymentImmigrationSupport,
  EmploymentWorkPreference,
  ExperienceLevel,
  JobLanguage,
  JobType,
  MainDomain,
} from "@prisma/client";

import { prisma } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/session";
import { getFeatureFlagsFromDb } from "@/lib/server/feature-flags";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type EmploymentProfilePayload = {
  professionalTitle: unknown;
  domain: unknown;
  experienceLevel: unknown;
  availability: unknown;
  residenceCountry: unknown;
  workPreference: unknown;
  targetProvinces: unknown;
  contractTypes: unknown;
  immigrationSupport: unknown;
  primaryLanguage: unknown;
  otherLanguagesText: unknown;
  cvUrl: unknown;
  consentUseCv: unknown;
  accuracyConfirmed: unknown;
};

function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.map((v) => String(v)).filter(Boolean);
}

function isEnumValue<T extends Record<string, string>>(e: T, v: string): v is T[keyof T] {
  return (Object.values(e) as string[]).includes(v);
}

function asEnumOrNull<T extends Record<string, string>>(e: T, v: unknown): T[keyof T] | null {
  const s = String(v ?? "");
  return isEnumValue(e, s) ? (s as T[keyof T]) : null;
}

function isComplete(profile: {
  professionalTitle: string;
  domain: string;
  experienceLevel: string;
  availability: string;
  residenceCountry: string;
  workPreference: string;
  contractTypes: string[];
  primaryLanguage: string;
  cvUrl: string;
  consentUseCv: boolean;
  accuracyConfirmed: boolean;
}): boolean {
  if (!profile.professionalTitle.trim()) return false;
  if (!profile.domain) return false;
  if (!profile.experienceLevel) return false;
  if (!profile.availability) return false;
  if (!profile.residenceCountry.trim()) return false;
  if (!profile.workPreference) return false;
  if (!profile.contractTypes.length) return false;
  if (!profile.primaryLanguage) return false;
  if (!profile.cvUrl) return false;
  if (!profile.consentUseCv) return false;
  if (!profile.accuracyConfirmed) return false;
  return true;
}

export async function GET() {
  const flags = await getFeatureFlagsFromDb();
  if (!flags.jobs) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const profile = await prisma.employmentProfile.findUnique({
    where: { userId: user.id },
    select: {
      professionalTitle: true,
      domain: true,
      experienceLevel: true,
      availability: true,
      residenceCountry: true,
      workPreference: true,
      targetProvinces: true,
      contractTypes: true,
      immigrationSupport: true,
      primaryLanguage: true,
      otherLanguagesText: true,
      cvUrl: true,
      consentUseCv: true,
      accuracyConfirmed: true,
    },
  });

  const dto = profile
    ? {
        professionalTitle: profile.professionalTitle,
        domain: profile.domain,
        experienceLevel: profile.experienceLevel,
        availability: profile.availability,
        residenceCountry: profile.residenceCountry,
        workPreference: profile.workPreference,
        targetProvinces: (profile.targetProvinces as unknown as string[]) ?? [],
        contractTypes: (profile.contractTypes as unknown as string[]) ?? [],
        immigrationSupport: profile.immigrationSupport,
        primaryLanguage: profile.primaryLanguage,
        otherLanguagesText: profile.otherLanguagesText ?? "",
        cvUrl: profile.cvUrl,
        consentUseCv: profile.consentUseCv,
        accuracyConfirmed: profile.accuracyConfirmed,
      }
    : null;

  const complete = dto
    ? isComplete({
        professionalTitle: dto.professionalTitle,
        domain: dto.domain,
        experienceLevel: dto.experienceLevel,
        availability: dto.availability,
        residenceCountry: dto.residenceCountry,
        workPreference: dto.workPreference,
        contractTypes: dto.contractTypes,
        primaryLanguage: dto.primaryLanguage,
        cvUrl: dto.cvUrl,
        consentUseCv: dto.consentUseCv,
        accuracyConfirmed: dto.accuracyConfirmed,
      })
    : false;

  return NextResponse.json({ profile: dto, isComplete: complete });
}

export async function PUT(req: Request) {
  const flags = await getFeatureFlagsFromDb();
  if (!flags.jobs) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Non authentifié." }, { status: 401 });
  }

  const body = (await req.json().catch(() => null)) as Partial<EmploymentProfilePayload> | null;
  if (!body) {
    return NextResponse.json({ error: "Body invalide." }, { status: 400 });
  }

  const domain = asEnumOrNull(MainDomain, body.domain);
  const experienceLevel = asEnumOrNull(ExperienceLevel, body.experienceLevel);
  const availability = asEnumOrNull(EmploymentAvailability, body.availability);
  const workPreference = asEnumOrNull(EmploymentWorkPreference, body.workPreference);
  const immigrationSupport = asEnumOrNull(EmploymentImmigrationSupport, body.immigrationSupport);
  const primaryLanguage = asEnumOrNull(JobLanguage, body.primaryLanguage);

  const contractTypes = asStringArray(body.contractTypes).filter((t) =>
    isEnumValue(JobType, t),
  ) as JobType[];

  const data = {
    professionalTitle: String(body.professionalTitle ?? "").trim(),
    domain,
    experienceLevel,
    availability,
    residenceCountry: String(body.residenceCountry ?? "").trim(),
    workPreference,
    targetProvinces: asStringArray(body.targetProvinces),
    contractTypes,
    immigrationSupport,
    primaryLanguage,
    otherLanguagesText: String(body.otherLanguagesText ?? ""),
    cvUrl: String(body.cvUrl ?? ""),
    consentUseCv: Boolean(body.consentUseCv),
    accuracyConfirmed: Boolean(body.accuracyConfirmed),
  };

  if (!data.professionalTitle) {
    return NextResponse.json({ error: "Titre professionnel requis." }, { status: 400 });
  }
  const domainValue = data.domain;
  if (!domainValue) {
    return NextResponse.json({ error: "Domaine requis." }, { status: 400 });
  }
  const experienceLevelValue = data.experienceLevel;
  if (!experienceLevelValue) {
    return NextResponse.json({ error: "Niveau d’expérience requis." }, { status: 400 });
  }
  const availabilityValue = data.availability;
  if (!availabilityValue) {
    return NextResponse.json({ error: "Disponibilité requise." }, { status: 400 });
  }
  if (!data.residenceCountry) {
    return NextResponse.json({ error: "Pays de résidence requis." }, { status: 400 });
  }
  const workPreferenceValue = data.workPreference;
  if (!workPreferenceValue) {
    return NextResponse.json({ error: "Préférence de travail requise." }, { status: 400 });
  }
  if (!data.contractTypes.length) {
    return NextResponse.json({ error: "Sélectionnez au moins un type de contrat." }, { status: 400 });
  }
  const immigrationSupportValue = data.immigrationSupport;
  if (!immigrationSupportValue) {
    return NextResponse.json({ error: "Statut immigration requis." }, { status: 400 });
  }
  const primaryLanguageValue = data.primaryLanguage;
  if (!primaryLanguageValue) {
    return NextResponse.json({ error: "Langue principale requise." }, { status: 400 });
  }
  if (!data.cvUrl) {
    return NextResponse.json({ error: "CV requis (PDF)." }, { status: 400 });
  }

  const saved = await prisma.employmentProfile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      professionalTitle: data.professionalTitle,
      domain: domainValue,
      experienceLevel: experienceLevelValue,
      availability: availabilityValue,
      residenceCountry: data.residenceCountry,
      workPreference: workPreferenceValue,
      targetProvinces: data.targetProvinces,
      contractTypes: data.contractTypes,
      immigrationSupport: immigrationSupportValue,
      primaryLanguage: primaryLanguageValue,
      otherLanguagesText: data.otherLanguagesText,
      cvUrl: data.cvUrl,
      consentUseCv: data.consentUseCv,
      accuracyConfirmed: data.accuracyConfirmed,
    },
    update: {
      professionalTitle: data.professionalTitle,
      domain: domainValue,
      experienceLevel: experienceLevelValue,
      availability: availabilityValue,
      residenceCountry: data.residenceCountry,
      workPreference: workPreferenceValue,
      targetProvinces: data.targetProvinces,
      contractTypes: data.contractTypes,
      immigrationSupport: immigrationSupportValue,
      primaryLanguage: primaryLanguageValue,
      otherLanguagesText: data.otherLanguagesText,
      cvUrl: data.cvUrl,
      consentUseCv: data.consentUseCv,
      accuracyConfirmed: data.accuracyConfirmed,
    },
    select: {
      userId: true,
    },
  });

  const complete = isComplete({
    professionalTitle: data.professionalTitle,
    domain: domainValue,
    experienceLevel: experienceLevelValue,
    availability: availabilityValue,
    residenceCountry: data.residenceCountry,
    workPreference: workPreferenceValue,
    contractTypes: data.contractTypes,
    primaryLanguage: primaryLanguageValue,
    cvUrl: data.cvUrl,
    consentUseCv: data.consentUseCv,
    accuracyConfirmed: data.accuracyConfirmed,
  });

  return NextResponse.json({ ok: true, profileUserId: saved.userId, isComplete: complete });
}
