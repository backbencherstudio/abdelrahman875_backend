import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { SojebStorage } from '../../../common/lib/Disk/SojebStorage';
import appConfig from '../../../config/app.config';
import { UserRepository } from '../../../common/repository/user/user.repository';
import { Role } from '../../../common/guard/role/role.enum';
import { FirebaseService } from 'src/modules/firebase/firebase.service';

@Injectable()
export class NotificationService {
  constructor(
    private prisma: PrismaService,
    private readonly firebaseService: FirebaseService,
  ) {}

  async createNotification({
    sender_id,
    receiver_id,
    text,
    type,
    entity_id,
  }: {
    sender_id?: string;
    receiver_id?: string;
    text: string;
    type?: string;
    entity_id?: string;
  }) {
    const notificationEvent = await this.prisma.notificationEvent.create({
      data: { type, text },
    });

    const notification = await this.prisma.notification.create({
      data: {
        sender_id,
        receiver_id,
        entity_id,
        notification_event_id: notificationEvent.id,
      },
      include: {
        receiver: { select: { id: true, name: true, fcm_token: true } },
        sender: true,
        notification_event: true,
      },
    });

    if (receiver_id && notification.receiver?.fcm_token) {
      try {
        await this.firebaseService.sendPushNotification(
          notification.receiver.fcm_token,
          'New Notification',
          text,
          { type, entity_id },
        );
      } catch (err) {
        console.error('Firebase push error:', err.message);
      }
    }

    return notification;
  }

  async findAll(user_id: string) {
    try {
      const where_condition = {};
      const userDetails = await UserRepository.getUserDetails(user_id);

      if (userDetails.type == Role.ADMIN) {
        where_condition['OR'] = [
          { receiver_id: { equals: user_id } },
          { receiver_id: { equals: null } },
        ];
      }
      // else if (userDetails.type == Role.VENDOR) {
      //   where_condition['receiver_id'] = user_id;
      // }

      const notifications = await this.prisma.notification.findMany({
        where: {
          ...where_condition,
        },
        select: {
          id: true,
          sender_id: true,
          receiver_id: true,
          entity_id: true,
          created_at: true,
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
          receiver: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
          notification_event: {
            select: {
              id: true,
              type: true,
              text: true,
            },
          },
        },
      });

      // add url to avatar
      if (notifications.length > 0) {
        for (const notification of notifications) {
          if (notification.sender && notification.sender.avatar) {
            notification.sender['avatar_url'] = SojebStorage.url(
              appConfig().storageUrl.avatar + notification.sender.avatar,
            );
          }

          if (notification.receiver && notification.receiver.avatar) {
            notification.receiver['avatar_url'] = SojebStorage.url(
              appConfig().storageUrl.avatar + notification.receiver.avatar,
            );
          }
        }
      }

      return {
        success: true,
        data: notifications,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async remove(id: string, user_id: string) {
    try {
      // check if notification exists
      const notification = await this.prisma.notification.findUnique({
        where: {
          id: id,
          // receiver_id: user_id,
        },
      });

      if (!notification) {
        return {
          success: false,
          message: 'Notification not found',
        };
      }

      await this.prisma.notification.delete({
        where: {
          id: id,
        },
      });

      return {
        success: true,
        message: 'Notification deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async removeAll(user_id: string) {
    try {
      // check if notification exists
      const notifications = await this.prisma.notification.findMany({
        where: {
          OR: [{ receiver_id: user_id }, { receiver_id: null }],
        },
      });

      if (notifications.length == 0) {
        return {
          success: false,
          message: 'Notification not found',
        };
      }

      await this.prisma.notification.deleteMany({
        where: {
          OR: [{ receiver_id: user_id }, { receiver_id: null }],
        },
      });

      return {
        success: true,
        message: 'All notifications deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
