import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../core/auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { CurrentUserType } from '../../../common/types/current-user.type';
import { BlocksService } from './blocks.service';
import { CreateBlockDto } from './dto/create-block.dto';

@Controller()
@UseGuards(JwtAuthGuard)
export class BlocksController {
  constructor(private readonly blocksService: BlocksService) {}

  @Get('admin/blocks')
  findAll(
    @CurrentUser() user: CurrentUserType,
    @Query('roomTypeId') roomTypeId?: string,
  ) {
    return this.blocksService.findAll(user.tenantId, user.hotelId, roomTypeId);
  }

  @Post('admin/blocks')
  create(@CurrentUser() user: CurrentUserType, @Body() dto: CreateBlockDto) {
    return this.blocksService.create(user.tenantId, user.hotelId, dto);
  }

  @Delete('admin/blocks/:id')
  remove(@CurrentUser() user: CurrentUserType, @Param('id') id: string) {
    return this.blocksService.remove(user.tenantId, user.hotelId, id);
  }
}
