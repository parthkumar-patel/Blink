"use client";

import { useState, useMemo } from "react";
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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Calendar, MapPin, ExternalLink, Search } from "lucide-react";

export default function ModerationQueuePage() {
  const [reason, setReason] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState("");

  const pending = useQuery(api.events.getPendingSubmissions, { limit: 100 });
  const approveEvent = useMutation(api.events.approveEvent);
  const rejectEvent = useMutation(api.events.rejectEvent);

  const filtered = useMemo(() => {
    const list = (pending || []) as Doc<"events">[];
    if (!filter.trim()) return list;
    const q = filter.toLowerCase();
    return list.filter((e) => e.title.toLowerCase().includes(q) || e.description.toLowerCase().includes(q));
  }, [pending, filter]);

  const doApprove = async (id: Id<"events">) => {
    try {
      await approveEvent({ eventId: id });
      toast.success("Event approved");
    } catch (e) {
      console.error(e);
      toast.error("Failed to approve");
    }
  };

  const doReject = async (id: Id<"events">) => {
    try {
      await rejectEvent({ eventId: id, reason: reason[id as string] });
      toast.success("Event rejected");
    } catch (e) {
      console.error(e);
      toast.error("Failed to reject");
    }
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <PageHeader title="Moderation Queue" description="Review and approve or reject submitted events" />
          <div className="flex gap-2">
            <Link href="/create-event"><Button variant="outline">Create Event</Button></Link>
            <Link href="/my-events/submissions"><Button>My Submissions</Button></Link>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search pending events..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {pending === undefined ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse h-48 rounded-lg border bg-white" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-gray-600">No pending submissions.</CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((e) => (
              <Card key={e._id} className="overflow-hidden">
                {e.images && e.images[0] && (
                  <div className="relative h-36">
                    <NextImage src={e.images[0]} alt={e.title} fill className="object-cover" />
                  </div>
                )}
                <CardHeader className="pb-2">
                  <CardTitle className="text-base truncate">{e.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-gray-600 space-y-3">
                  <div className="line-clamp-2">{e.description}</div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(e.startDate).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    <span className="truncate">{e.location?.isVirtual ? "Virtual" : e.location?.name}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Link href={`/events/${e._id}`}>
                      <Button size="sm" variant="outline" className="gap-1"><ExternalLink className="w-3 h-3" /> View</Button>
                    </Link>
                    <Badge variant="secondary" className="ml-auto">{e.organizer?.name}</Badge>
                  </div>

                  <div className="pt-3 border-t space-y-2">
                    <Textarea
                      placeholder="Optional rejection reason"
                      value={reason[e._id as string] || ""}
                      onChange={(ev) => setReason((r) => ({ ...r, [e._id]: ev.target.value }))}
                      rows={2}
                    />
                    <div className="flex gap-2">
                      <Button className="bg-green-600 hover:bg-green-700" size="sm" onClick={() => doApprove(e._id)}>Approve</Button>
                      <Button variant="destructive" size="sm" onClick={() => doReject(e._id)}>Reject</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
