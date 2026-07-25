import { notFound } from "next/navigation";

import { PublicMasterProfile } from "@/components/master/public-master-profile";
import { getSession } from "@/lib/auth/session";
import { getRankedCandidate } from "@/lib/marketplace/ranking";
import { getPublicMasterProfileData } from "@/lib/masters/repository";
import type { MasterProfileData } from "@/lib/masters/types";

export default async function PublicMasterProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ masterId: string }>;
  searchParams: Promise<{ orderId?: string; offerId?: string }>;
}) {
  const { masterId } = await params;
  const query = await searchParams;
  let candidate: ReturnType<typeof getRankedCandidate> | undefined;
  if (query.orderId || query.offerId) {
    if (!query.orderId || !query.offerId) notFound();
    const viewer = await getSession();
    if (!viewer || viewer.role !== "CLIENT") notFound();
    candidate = getRankedCandidate(viewer.id, query.orderId, query.offerId);
    if (!candidate || candidate.masterId !== masterId) notFound();
  }
  let data: MasterProfileData | null = null;
  try {
    data = getPublicMasterProfileData(masterId);
  } catch {
    notFound();
  }
  if (!data) notFound();
  return <PublicMasterProfile data={data} candidate={candidate ?? undefined} backHref={candidate ? `/client/orders/${candidate.orderId}` : "/"} />;
}
