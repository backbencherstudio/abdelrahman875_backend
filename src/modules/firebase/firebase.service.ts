import { Injectable } from '@nestjs/common';
import * as admin from 'firebase-admin';
import appConfig from 'src/config/app.config';

const firebaseConfig = appConfig().firebaseConfig;

@Injectable()
export class FirebaseService {
  constructor() {
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(firebaseConfig),
      });
    }
  }

  async sendPushNotification(
    token: string,
    title: string,
    body: string,
    data?: any,
  ) {
    return await admin.messaging().send({
      token,
      notification: { title, body },
      data: data ? JSON.parse(JSON.stringify(data)) : undefined,
    });
  }
}
