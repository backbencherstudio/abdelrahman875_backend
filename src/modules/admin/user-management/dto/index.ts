// DTO for query
export class UserFilterDto {
  q?: string;           // search term
  status?: 'active' | 'blocked';
  type?: 'carrier' | 'shipper';
  page?: number;        // optional pagination
  limit?: number;
}
