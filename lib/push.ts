import webpush from "web-push";

webpush.setVapidDetails(
  "mailto:griffinmaklansky@gmail.com",
  process.env.VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!
);

export async function sendPushNotification(
  subscription: webpush.PushSubscription,
  payload: { title: string; body: string }
) {
  await webpush.sendNotification(subscription, JSON.stringify(payload));
}
