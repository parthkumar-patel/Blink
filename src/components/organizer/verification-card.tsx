"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, Clock, XCircle, AlertCircle, Shield } from "lucide-react";
import { useState } from "react";

export function VerificationCard() {
  const [organizationName, setOrganizationName] = useState("");
  const [verificationStatus] = useState<"verified" | "pending" | "rejected" | "unverified">("unverified");

  const getStatusBadge = () => {
    switch (verificationStatus) {
      case "verified":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            <CheckCircle className="w-4 h-4 mr-1" />
            Verified
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            <Clock className="w-4 h-4 mr-1" />
            Pending Review
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive">
            <XCircle className="w-4 h-4 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            <AlertCircle className="w-4 h-4 mr-1" />
            Not Submitted
          </Badge>
        );
    }
  };

  const getStatusDescription = () => {
    switch (verificationStatus) {
      case "verified":
        return "Your organizer account is verified. You can create events and they will be approved faster.";
      case "pending":
        return "Your verification request is being reviewed. This usually takes 1-3 business days.";
      case "rejected":
        return "Your verification request was rejected. Please contact support for more information.";
      default:
        return "Submit a verification request to become a verified organizer and get faster event approvals.";
    }
  };

  const handleSubmitVerification = async () => {
    if (!organizationName.trim()) return;
    
    try {
      // TODO: Implement verification submission
      console.log("Submitting verification for:", organizationName);
      setOrganizationName("");
    } catch (error) {
      console.error("Failed to submit verification:", error);
    }
  };

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Verification Status
          </CardTitle>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          {getStatusDescription()}
        </p>
        
        {verificationStatus === "unverified" && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="organization">Organization Name</Label>
              <Input
                id="organization"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                placeholder="Enter your organization name"
              />
            </div>
            <Button 
              onClick={handleSubmitVerification}
              disabled={!organizationName.trim()}
              className="w-full"
            >
              Submit Verification Request
            </Button>
          </div>
        )}

        {verificationStatus === "pending" && (
          <div className="text-center py-4">
            <Clock className="w-12 h-12 mx-auto text-yellow-500 mb-2" />
            <p className="text-sm text-muted-foreground">
              Your request is being reviewed
            </p>
          </div>
        )}

        {verificationStatus === "verified" && (
          <div className="text-center py-4">
            <CheckCircle className="w-12 h-12 mx-auto text-green-500 mb-2" />
            <p className="text-sm text-muted-foreground">
              Organization: Your Organization Name
            </p>
          </div>
        )}

        {verificationStatus === "rejected" && (
          <div className="space-y-4">
            <div className="text-center py-4">
              <XCircle className="w-12 h-12 mx-auto text-red-500 mb-2" />
              <p className="text-sm text-muted-foreground">
                Please contact support for more information.
              </p>
            </div>
            <div>
              <Label htmlFor="organization">Organization Name</Label>
              <Input
                id="organization"
                value={organizationName}
                onChange={(e) => setOrganizationName(e.target.value)}
                placeholder="Enter your organization name"
              />
            </div>
            <Button 
              onClick={handleSubmitVerification}
              disabled={!organizationName.trim()}
              className="w-full"
            >
              Resubmit Verification Request
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
