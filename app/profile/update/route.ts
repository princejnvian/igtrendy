import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();

    const fullName =
      typeof body.fullName === "string"
        ? body.fullName.trim()
        : "";

    const username =
      typeof body.username === "string"
        ? body.username.trim().toLowerCase()
        : "";

    const bio =
      typeof body.bio === "string"
        ? body.bio.trim()
        : "";

    const skills = Array.isArray(body.skills)
      ? body.skills.filter(
          (skill: unknown): skill is string =>
            typeof skill === "string"
        )
      : [];

    const avatarUrl =
      typeof body.avatarUrl === "string"
        ? body.avatarUrl.trim()
        : "";

    const categories = Array.isArray(body.categories)
      ? body.categories.filter((item: unknown): item is string => typeof item === "string").slice(0, 3)
      : [];

    const primaryCategory =
      typeof body.primaryCategory === "string" && categories.includes(body.primaryCategory)
        ? body.primaryCategory
        : categories[0] || null;

    const startingPrice =
      body.startingPrice === null || body.startingPrice === undefined || body.startingPrice === ""
        ? null
        : Number(body.startingPrice);

    const servicePackages = Array.isArray(body.servicePackages)
      ? body.servicePackages.slice(0, 3).map((item: any) => ({
          id: typeof item?.id === "string" ? item.id.slice(0, 40) : crypto.randomUUID(),
          name: typeof item?.name === "string" ? item.name.slice(0, 40) : "Package",
          description: typeof item?.description === "string" ? item.description.slice(0, 240) : "",
          price: Math.max(0, Number(item?.price) || 0),
          deliveryDays: Math.max(1, Math.min(365, Number(item?.deliveryDays) || 1)),
          revisions: Math.max(0, Math.min(50, Number(item?.revisions) || 0)),
        }))
      : [];

    const gigs = Array.isArray(body.gigs)
      ? body.gigs.slice(0, 20).map((gig: any, index: number) => ({
          id: typeof gig?.id === "string" && gig.id ? gig.id.slice(0, 80) : crypto.randomUUID(),
          title: typeof gig?.title === "string" ? gig.title.trim().slice(0, 120) : `Gig ${index + 1}`,
          category: typeof gig?.category === "string" ? gig.category.trim().slice(0, 80) : categories[0] || "Creative Services",
          description: typeof gig?.description === "string" ? gig.description.trim().slice(0, 700) : "",
          media: Array.isArray(gig?.media) ? gig.media.slice(0, 6).map((media: any) => ({
            id: typeof media?.id === "string" && media.id ? media.id.slice(0, 80) : crypto.randomUUID(),
            url: typeof media?.url === "string" ? media.url.slice(0, 2000) : "",
            mediaType: media?.mediaType === "video" ? "video" : "image",
            title: typeof media?.title === "string" ? media.title.slice(0, 120) : "",
            path: typeof media?.path === "string" ? media.path.slice(0, 2000) : "",
          })).filter((media: any) => media.url) : [],
          packages: Array.isArray(gig?.packages) ? gig.packages.slice(0, 3).map((item: any, packageIndex: number) => ({
            id: typeof item?.id === "string" && item.id ? item.id.slice(0, 40) : ["basic", "standard", "premium"][packageIndex] || crypto.randomUUID(),
            name: typeof item?.name === "string" && item.name.trim() ? item.name.trim().slice(0, 40) : ["Basic", "Standard", "Premium"][packageIndex] || `Package ${packageIndex + 1}`,
            description: typeof item?.description === "string" ? item.description.slice(0, 700) : "",
            scope: typeof item?.scope === "string" ? item.scope.slice(0, 250) : "",
            includes: typeof item?.includes === "string" ? item.includes.slice(0, 700) : "",
            price: Math.max(0, Number(item?.price) || 0),
            deliveryDays: Math.max(1, Math.min(365, Number(item?.deliveryDays) || 1)),
            revisions: Math.max(0, Math.min(50, Number(item?.revisions) || 0)),
          })) : [],
        })).filter((gig: any) => gig.title && gig.packages.length > 0)
      : [];

    const portfolio = Array.isArray(body.portfolio)
      ? body.portfolio.slice(0, 12).map((item: any) => ({
          id: typeof item?.id === "string" ? item.id.slice(0, 80) : crypto.randomUUID(),
          title: typeof item?.title === "string" ? item.title.slice(0, 100) : "Portfolio Work",
          description: typeof item?.description === "string" ? item.description.slice(0, 300) : "",
          url: typeof item?.url === "string" ? item.url.slice(0, 2000) : "",
          mediaType: item?.mediaType === "video" || item?.mediaType === "audio" ? item.mediaType : "image",
          category: typeof item?.category === "string" ? item.category.slice(0, 80) : categories[0] || "Creative Work",
        }))
      : [];

    if (!fullName) {
      return NextResponse.json(
        { error: "Please enter your full name." },
        { status: 400 }
      );
    }

    if (!username) {
      return NextResponse.json(
        { error: "Please choose a username." },
        { status: 400 }
      );
    }

    if (!/^[a-z0-9_]+$/.test(username)) {
      return NextResponse.json(
        {
          error:
            "Username can only contain lowercase letters, numbers and underscores.",
        },
        { status: 400 }
      );
    }

    if (username.length > 30) {
      return NextResponse.json(
        { error: "Username must be 30 characters or less." },
        { status: 400 }
      );
    }

    if (fullName.length > 100) {
      return NextResponse.json(
        { error: "Full name must be 100 characters or less." },
        { status: 400 }
      );
    }

    if (bio.length > 500) {
      return NextResponse.json(
        { error: "Bio must be 500 characters or less." },
        { status: 400 }
      );
    }

    if (skills.length > 8) {
      return NextResponse.json(
        { error: "You can select up to 8 skills." },
        { status: 400 }
      );
    }

    if (categories.length > 3) {
      return NextResponse.json(
        { error: "You can select up to 3 categories." },
        { status: 400 }
      );
    }

    if (startingPrice !== null && (!Number.isFinite(startingPrice) || startingPrice < 0 || startingPrice > 10000000)) {
      return NextResponse.json(
        { error: "Starting price must be between ₹0 and ₹1,00,00,000." },
        { status: 400 }
      );
    }

    const { data: existingProfile, error: profileFetchError } =
      await supabaseAdmin
        .from("profiles")
        .select("account_type")
        .eq("id", user.id)
        .maybeSingle();

    if (profileFetchError) {
      console.error(profileFetchError);

      return NextResponse.json(
        { error: "Unable to load your profile." },
        { status: 500 }
      );
    }

    /*
     * IMPORTANT:
     * account_type is deliberately NOT taken from the request.
     *
     * This prevents a user from changing their account type
     * through a manually crafted API request.
     *
     * If no profile exists yet, use the account type stored
     * in authenticated user metadata, falling back to client.
     */
    const accountType =
      existingProfile?.account_type === "freelancer" ||
      existingProfile?.account_type === "client"
        ? existingProfile.account_type
        : user.user_metadata?.account_type === "freelancer"
        ? "freelancer"
        : "client";

    const freelancerFields =
      accountType === "freelancer"
        ? {
            skills,
            categories,
            primary_category: primaryCategory,
            starting_price: startingPrice,
            service_packages: servicePackages,
            gigs,
            portfolio,
          }
        : {
            skills: [],
            categories: [],
            primary_category: null,
            starting_price: null,
            service_packages: [],
            gigs: [],
            portfolio: [],
          };

    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .upsert(
        {
          id: user.id,
          full_name: fullName,
          username,
          bio,
          account_type: accountType,
          avatar_url: avatarUrl,
          ...freelancerFields,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "id",
        }
      );

    if (updateError) {
      console.error(updateError);

      if (updateError.code === "23505") {
        return NextResponse.json(
          {
            error:
              "That username is already taken. Please choose another one.",
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        { error: "Unable to save your profile." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      accountType,
    });
  } catch (error) {
    console.error("Profile update error:", error);

    return NextResponse.json(
      { error: "Something went wrong while saving your profile." },
      { status: 500 }
    );
  }
}