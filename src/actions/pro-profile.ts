
"use server";

import { prisma } from "@/lib/db";
import { getAppViewer } from "@/lib/auth/viewer";
import { revalidatePath } from "next/cache";
import { MarketplaceProfession } from "@prisma/client";

export async function updateProProfile(formData: FormData) {
    const viewer = await getAppViewer();
    if (!viewer) throw new Error("Non autorisé");

    const headline = formData.get("headline") as string;
    const bio = formData.get("bio") as string;
    const profession = formData.get("profession") as MarketplaceProfession || "IMMIGRATION_CONSULTANT";
    const city = formData.get("city") as string;
    const country = formData.get("country") as string;
    const experienceYears = parseInt(formData.get("experienceYears") as string) || 0;
    
    // Complex fields handling (simplified for this demo)
    const languages = (formData.get("languages") as string)?.split(",").map(s => s.trim()).filter(Boolean) || [];
    const specialties = (formData.get("specialties") as string)?.split(",").map(s => s.trim()).filter(Boolean) || [];

    // Update Profile
    await prisma.marketplaceProfile.upsert({
        where: { userId: viewer.id },
        update: {
            headline,
            bioLong: bio,
            city,
            country,
            profession,
            experienceYears,
            languagesJson: languages,
            specialtiesJson: specialties,
        },
        create: {
            userId: viewer.id,
            headline,
            bioLong: bio,
            city: city || "Montreal",
            country: country || "Canada",
            profession,
            experienceYears,
            languagesJson: languages,
            specialtiesJson: specialties,
            status: "DRAFT"
        }
    });

    // Update User Info
    const fullName = formData.get("fullName") as string;
    if (fullName) {
        await prisma.user.update({
            where: { id: viewer.id },
            data: { fullName }
        });
    }

    revalidatePath("/pro/profile");
    revalidatePath(`/pro/${viewer.id}`);
    
    return { success: true };
}
