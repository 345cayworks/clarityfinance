import type { UserRole } from "@/lib/types/roles";
export function AdminInviteUserPanel({ inviteMessage, setInviteMessage }: { inviteMessage: string; setInviteMessage: (v: string) => void }) { return <div className="rounded border p-3 text-sm">Invite flow ready.<textarea className="mt-2 w-full rounded border p-2" value={inviteMessage} onChange={(e)=>setInviteMessage(e.target.value)} /></div>; }
