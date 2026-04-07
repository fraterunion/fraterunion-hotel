export type CurrentUserType = {
  id: string;
  email: string;
  role: string;
  tenantId: string;
  hotelId?: string | null;
};