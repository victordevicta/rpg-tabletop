import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { CurrentUser, RequestUser } from '../../common/decorators/user.decorator';
import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

class MockLoginDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsEmail()
  @IsOptional()
  email?: string;
}

@Controller('auth')
export class AuthController {
  constructor(private auth: AuthService) {}

  @Post('mock-login')
  mockLogin(@Body() dto: MockLoginDto) {
    return this.auth.mockLogin(dto.name, dto.email);
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  getProfile(@CurrentUser() user: RequestUser) {
    return this.auth.getProfile(user.id);
  }
}
