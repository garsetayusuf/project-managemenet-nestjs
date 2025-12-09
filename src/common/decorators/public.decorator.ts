import { SetMetadata } from '@nestjs/common';
import { METADATA_PUBLIC_ROLE_KEY } from '../constants/public-role.constant';

export const IsPublic = () => SetMetadata(METADATA_PUBLIC_ROLE_KEY, true);
