import { NextResponse } from "next/server";
import { z } from "zod";
import { fail, ok } from "@/lib/api";
import {
  getDueReviewItems,
  markReviewItemReviewed,
} from "@/lib/supabase/persistence";

const requestSchema = z.object({
  itemId: z.string().uuid(),
  rating: z.enum(["again", "good", "easy"]),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || "20"), 1), 50);
  const reviewItems = await getDueReviewItems(limit);

  return NextResponse.json(ok(reviewItems));
}

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      fail("invalid_request", "The request payload is invalid."),
      { status: 400 },
    );
  }

  const result = await markReviewItemReviewed(parsed.data);

  if (!result.saved) {
    return NextResponse.json(
      fail("review_update_failed", result.reason ?? "Could not update review item."),
      { status: 409 },
    );
  }

  return NextResponse.json(ok(result));
}
