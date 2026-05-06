import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma.module';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  async mockLogin(name: string, email?: string) {
    let user = email
      ? await this.prisma.user.findUnique({ where: { email } })
      : null;

    if (!user) {
      user = await this.prisma.user.create({
        data: { name, email, avatarUrl: `https://api.dicebear.com/9.x/bottts/svg?seed=${name}` },
      });
    }

    const token = this.jwt.sign({ sub: user.id, name: user.name, email: user.email });
    return { user, token };
  }

  async getProfile(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      include: { discordAccount: true },
    });
  }

  async validateDiscordCallback(
    discordId: string,
    discordUsername: string,
    discordAvatar: string | null,
    accessToken: string,
    refreshToken: string,
  ) {
    let discordAccount = await this.prisma.discordAccount.findUnique({
      where: { discordId },
      include: { user: true },
    });

    if (discordAccount) {
      await this.prisma.discordAccount.update({
        where: { discordId },
        data: { discordUsername, discordAvatar, accessToken, refreshToken },
      });
      const token = this.jwt.sign({ sub: discordAccount.user.id, name: discordAccount.user.name });
      return { user: discordAccount.user, token };
    }

    const user = await this.prisma.user.create({
      data: {
        name: discordUsername,
        avatarUrl: discordAvatar
          ? `https://cdn.discordapp.com/avatars/${discordId}/${discordAvatar}.png`
          : undefined,
        discordAccount: {
          create: { discordId, discordUsername, discordAvatar, accessToken, refreshToken },
        },
      },
    });

    const token = this.jwt.sign({ sub: user.id, name: user.name });
    return { user, token };
  }
}
