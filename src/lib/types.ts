export type ItemType = "LOST" | "FOUND";
export type ItemStatus = "OPEN" | "MATCHED" | "CLAIM_PENDING" | "VERIFICATION_PENDING" | "CLAIM_APPROVED" | "CLAIM_REJECTED" | "RETURN_IN_PROGRESS" | "RETURNED" | "CLOSED" | "CANCELLED";
export type MatchStatus = "POTENTIAL" | "VIEWED" | "CLAIM_STARTED" | "VERIFICATION_PENDING" | "CONFIRMED" | "DISMISSED" | "EXPIRED";
export type ClaimStatus = "PENDING" | "VERIFICATION_PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
export type NotificationType = "NEW_MATCH" | "CLAIM_REQUEST" | "CLAIM_APPROVED" | "CLAIM_REJECTED" | "NEW_MESSAGE" | "RETURN_REQUEST" | "RETURN_CONFIRMED" | "SYSTEM";

export interface AppUser {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  phone?: string;
  city?: string;
  organization?: string;
  verificationStatus?: string;
  role?: "user" | "admin";
  createdAt: string;
  updatedAt: string;
}
export interface ItemLocation { city: string; area: string; placeName: string; lat?: number; lng?: number; }
export interface ItemPrivate { serialNumber?: string; engraving?: string; uniqueMark?: string; privateDescription?: string; verificationHints?: string[]; }
export interface ItemDoc {
  id: string; ownerId: string; type: ItemType; category: string; subcategory: string; title: string; description: string;
  brand?: string; model?: string; color?: string; dateOccurred: string; location: ItemLocation; status: ItemStatus;
  visibility: "PUBLIC" | "PRIVATE"; imageCount: number; imageUrls: string[]; imagePaths?: string[]; privateDetails?: ItemPrivate;
  possessionStatus?: string; createdAt: string; updatedAt: string; resolvedAt?: string | null;
}
export interface MatchDoc { id: string; lostItemId: string; foundItemId: string; lostOwnerId: string; foundOwnerId: string; score: number; scoreBreakdown: Record<string,number>; status: MatchStatus; createdAt: string; }
export interface ClaimDoc { id: string; matchId: string; itemId: string; claimantId: string; ownerId: string; status: ClaimStatus; answers?: Record<string,string>; createdAt: string; updatedAt: string; }
export interface Conversation { id: string; participants: string[]; itemId: string; matchId?: string; status: "ACTIVE" | "CLOSED"; lastMessage?: string; lastMessageAt?: string; createdAt: string; }
export interface MessageDoc { id: string; senderId: string; text: string; createdAt: string; readBy: string[]; }
export interface NotificationDoc { id: string; userId: string; type: NotificationType; title: string; body: string; itemId?: string; matchId?: string; read: boolean; createdAt: string; }
export interface ReportDoc { id: string; reporterId: string; targetType: "ITEM"|"USER"|"MESSAGE"; targetId: string; reason: string; description: string; status: "OPEN"|"REVIEWED"|"RESOLVED"|"DISMISSED"; createdAt: string; }
export interface AuditLog { id: string; actorId: string; action: string; targetType: string; targetId: string; metadata?: Record<string,unknown>; createdAt: string; }

export const CATEGORIES = ["electronics","documents","jewelry","bags","clothing","keys","books","sports","toys","other"] as const;
export const COLORS = ["Black","White","Blue","Red","Green","Brown","Grey","Yellow","Silver","Gold","Other"] as const;
