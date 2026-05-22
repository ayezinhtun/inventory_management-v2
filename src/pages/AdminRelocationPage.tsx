import React, { useState } from 'react';
import { useRelocationStore } from '../store/useRelocationStore';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Textarea } from '../components/ui/Textarea';
import { toast } from 'sonner';
import { CheckCircle, XCircle, Wrench } from 'lucide-react';

export function AdminRelocationPage() {
  const {
    relocationRequests,
    approveRelocationAdmin,
    rejectRelocationAdmin,
  } = useRelocationStore();
  const [comments, setComments] = useState<{ [key: string]: string }>({});

  const pendingAdminRequests = relocationRequests.filter(
    req => req.status === 'Pending Admin Approval'
  );

  const handleAdminApprove = async (requestId: string) => {
    try {
      await approveRelocationAdmin(requestId, comments[requestId] || '');

      toast.success('Relocation approved and database updated');
    } catch (error) {
      toast.error('Failed to approve relocation');
    }
  };

  const handleAdminReject = async (requestId: string) => {
    try {
      await rejectRelocationAdmin(requestId, comments[requestId] || '');
      toast.success('Relocation request rejected');
    } catch (error) {
      toast.error('Failed to reject request');
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Admin Relocation Requests</h1>
        <p className="text-muted-foreground">Review and complete relocation requests</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Pending Admin Approval
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingAdminRequests.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No pending requests</p>
          ) : (
            <div className="space-y-4">
              {pendingAdminRequests.map((request) => (
                <div key={request.id} className="border rounded-lg p-4">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <p className="font-medium">Request Number</p>
                      <p className="text-sm text-muted-foreground">{request.request_number}</p>
                    </div>
                    <div>
                      <p className="font-medium">Urgency</p>
                      <Badge variant="outline">{request.urgency}</Badge>
                    </div>
                    <div>
                      <p className="font-medium">PM Comments</p>
                      <p className="text-sm">{request.pm_comments}</p>
                    </div>
                    <div>
                      <p className="font-medium">Reason</p>
                      <p className="text-sm">{request.reason}</p>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <label className="text-sm font-medium">Admin Comments</label>
                    <Textarea
                      value={comments[request.id] || ''}
                      onChange={(e) => setComments(prev => ({ ...prev, [request.id]: e.target.value }))}
                      placeholder="Add comments for your decision..."
                      rows={2}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleAdminApprove(request.id)}
                      className="flex items-center gap-2"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Approve & Complete
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={() => handleAdminReject(request.id)}
                      className="flex items-center gap-2"
                    >
                      <XCircle className="h-4 w-4" />
                      Reject
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}