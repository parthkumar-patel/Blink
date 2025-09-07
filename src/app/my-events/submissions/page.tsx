"use client";

import { useMemo, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import NextImage from "next/image";
import Link from "next/link";
import type { Doc, Id } from "../../../../convex/_generated/dataModel";
import { api } from "../../../../convex/_generated/api";
import { AppLayout } from "@/components/layout/app-layout";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Calendar, MapPin, CheckCircle2, XCircle, Hourglass, ExternalLink, Pencil } from "lucide-react";

export default function MySubmissionsPage() {
  const { user } = useUser();
  const submissions = useQuery(api.events.getMySubmissions, {});
  const updateEvent = useMutation(api.events.updateEvent);

  const [resubmittingId, setResubmittingId] = useState<string | null>(null);

  type EventDoc = Doc<"events">;

  const grouped = useMemo(() => {
    const g: Record<"pending" | "approved" | "rejected", EventDoc[]> = {
      pending: [],
      approved: [],
      rejected: [],
    };
    (submissions || []).forEach((e: EventDoc) => {
      const s = (e.status as EventDoc["status"]) || "approved"; // legacy treated as approved
      if (s === "pending") g.pending.push(e);
      else if (s === "rejected") g.rejected.push(e);
      else g.approved.push(e);
    });
    return g;
  }, [submissions]);

  const resubmit = async (eventId: Id<"events">) => {
    if (!user?.id) return;
    setResubmittingId(eventId);
    try {
      await updateEvent({ eventId, clerkId: user.id, status: "pending" });
      toast.success("Resubmitted for review");
    } catch (e: unknown) {
      console.error(e);
      const msg = e instanceof Error ? e.message : "Failed to resubmit";
      toast.error(msg);
    } finally {
      setResubmittingId(null);
    }
  };

  if (!user) {
    return (
      <AppLayout>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 text-center">
          <p>Please sign in to view your submissions.</p>
        </div>
      </AppLayout>
    );
  }

  if (submissions === undefined) {
    return (
      <AppLayout>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <PageHeader title="My Submissions" description="Track your event approvals" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse h-40 rounded-lg border bg-white" />
            ))}
          </div>
        </div>
      </AppLayout>
    );
  }

  if (!submissions || submissions.length === 0) {
    return (
      <AppLayout>
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <PageHeader title="My Submissions" description="Track your event approvals" />
          <Card>
            <CardContent className="py-10 text-center">
              <Hourglass className="w-10 h-10 text-gray-400 mx-auto mb-3" />
              <h3 className="text-lg font-medium mb-2">No submissions yet</h3>
              <p className="text-gray-600 mb-5">Create your first event to submit for approval.</p>
              <Link href="/create-event">
                <Button>Create Event</Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <PageHeader title="My Submissions" description="Track and manage your submitted events" />
          <div className="flex gap-2">
            <Link href="/create-event"><Button>New Event</Button></Link>
            <Link href="/my-events/manage"><Button variant="outline">Manage Events</Button></Link>
          </div>
        </div>

        {/* Pending */}
        {grouped.pending.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Hourglass className="w-4 h-4 text-amber-600" />
              <h3 className="font-semibold">Pending Review</h3>
              <Badge className="bg-amber-100 text-amber-700" variant="secondary">{grouped.pending.length}</Badge>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {grouped.pending.map((e: EventDoc) => (
                <Card key={e._id} className="overflow-hidden">
                  {e.images && e.images[0] && (
                    <div className="relative h-36">
                      <NextImage src={e.images[0]} alt={e.title} fill className="object-cover" />
                    </div>
                  )}
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base truncate flex items-center gap-2">
                      {e.title}
                      <Badge className="bg-amber-100 text-amber-700" variant="secondary">Pending</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-gray-600">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(e.startDate).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2 mb-4">
                      <MapPin className="w-4 h-4" />
                      <span className="truncate">{e.location?.isVirtual ? "Virtual" : e.location?.name}</span>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/events/${e._id}`}> 
                        <Button size="sm" variant="outline" className="gap-1"><ExternalLink className="w-3 h-3" /> View</Button>
                      </Link>
                      <Link href={`/events/${e._id}/edit`}>
                        <Button size="sm" variant="outline" className="gap-1"><Pencil className="w-3 h-3" /> Edit</Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Rejected */}
        {grouped.rejected.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <XCircle className="w-4 h-4 text-red-600" />
              <h3 className="font-semibold">Needs Changes</h3>
              <Badge className="bg-red-100 text-red-700" variant="secondary">{grouped.rejected.length}</Badge>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {grouped.rejected.map((e: EventDoc) => (
                <Card key={e._id} className="overflow-hidden">
                  {e.images && e.images[0] && (
                    <div className="relative h-36">
                      <NextImage src={e.images[0]} alt={e.title} fill className="object-cover" />
                    </div>
                  )}
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base truncate flex items-center gap-2">
                      {e.title}
                      <Badge className="bg-red-100 text-red-700" variant="secondary">Rejected</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-gray-600">
                    {e.rejectionReason && (
                      <div className="mb-3 p-2 rounded border border-red-200 bg-red-50 text-red-700 text-xs">
                        {e.rejectionReason}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Link href={`/events/${e._id}/edit`}>
                        <Button size="sm" variant="outline" className="gap-1"><Pencil className="w-3 h-3" /> Edit</Button>
                      </Link>
                      <Button size="sm" onClick={() => resubmit(e._id)} disabled={resubmittingId === e._id} className="bg-blue-600 hover:bg-blue-700">
                        {resubmittingId === (e._id as string) ? "Resubmitting..." : "Resubmit"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        {/* Approved */}
        <section>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <h3 className="font-semibold">Approved</h3>
            <Badge className="bg-green-100 text-green-700" variant="secondary">{grouped.approved.length}</Badge>
          </div>
          {grouped.approved.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center text-gray-600">No approved events yet.</CardContent>
            </Card>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {grouped.approved.map((e: EventDoc) => (
                <Card key={e._id} className="overflow-hidden">
                  {e.images && e.images[0] && (
                    <div className="relative h-36">
                      <NextImage src={e.images[0]} alt={e.title} fill className="object-cover" />
                    </div>
                  )}
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base truncate flex items-center gap-2">
                      {e.title}
                      <Badge className="bg-green-100 text-green-700" variant="secondary">Approved</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-sm text-gray-600">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4" />
                      <span>{new Date(e.startDate).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2 mb-4">
                      <MapPin className="w-4 h-4" />
                      <span className="truncate">{e.location?.isVirtual ? "Virtual" : e.location?.name}</span>
                    </div>
                    <div className="flex gap-2">
                      <Link href={`/events/${e._id}`}><Button size="sm" variant="outline" className="gap-1"><ExternalLink className="w-3 h-3" /> View</Button></Link>
                      <Link href={`/events/${e._id}/edit`}><Button size="sm" variant="outline" className="gap-1"><Pencil className="w-3 h-3" /> Edit</Button></Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  );
}
