import { DEFAULT_PAGE, DEFAULT_PAGE_SIZE } from '@common/constants';
import { PaginationQueryDto } from '@shared/dto';

export function toSkipTake(query: PaginationQueryDto): { skip: number; take: number } {
  const page = query.page ?? DEFAULT_PAGE;
  const limit = query.limit ?? DEFAULT_PAGE_SIZE;

  return { skip: (page - 1) * limit, take: limit };
}
