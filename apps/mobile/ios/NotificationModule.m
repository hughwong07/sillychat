#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>
#import <UserNotifications/UserNotifications.h>

@interface NotificationModule : RCTEventEmitter <RCTBridgeModule, UNUserNotificationCenterDelegate>
@end

@implementation NotificationModule

static NSString *const CHANNEL_ID = @"sillychat_default_channel";
static NSString *const EVENT_NOTIFICATION_RECEIVED = @"onNotificationReceived";
static NSString *const EVENT_NOTIFICATION_OPENED = @"onNotificationOpened";
static NSString *const EVENT_TOKEN_RECEIVED = @"onTokenReceived";

RCT_EXPORT_MODULE(NotificationModule);

+ (BOOL)requiresMainQueueSetup {
    return YES;
}

- (NSArray<NSString *> *)supportedEvents {
    return @[
        EVENT_NOTIFICATION_RECEIVED,
        EVENT_NOTIFICATION_OPENED,
        EVENT_TOKEN_RECEIVED
    ];
}

- (void)startObserving {
    // Set up notification center delegate
    UNUserNotificationCenter *center = [UNUserNotificationCenter currentNotificationCenter];
    center.delegate = self;
}

- (void)stopObserving {
    UNUserNotificationCenter *center = [UNUserNotificationCenter currentNotificationCenter];
    if (center.delegate == self) {
        center.delegate = nil;
    }
}

#pragma mark - React Methods

RCT_EXPORT_METHOD(requestPermissions:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    dispatch_async(dispatch_get_main_queue(), ^{
        UNUserNotificationCenter *center = [UNUserNotificationCenter currentNotificationCenter];

        [center requestAuthorizationWithOptions:(UNAuthorizationOptionAlert |
                                                  UNAuthorizationOptionBadge |
                                                  UNAuthorizationOptionSound)
                              completionHandler:^(BOOL granted, NSError * _Nullable error) {
            if (error) {
                reject(@"PERMISSION_ERROR", @"Failed to request notification permissions", error);
                return;
            }

            NSDictionary *result = @{
                @"alert": @(granted),
                @"badge": @(granted),
                @"sound": @(granted)
            };
            resolve(result);

            if (granted) {
                dispatch_async(dispatch_get_main_queue(), ^{
                    [[UIApplication sharedApplication] registerForRemoteNotifications];
                });
            }
        }];
    });
}

RCT_EXPORT_METHOD(checkPermissions:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    UNUserNotificationCenter *center = [UNUserNotificationCenter currentNotificationCenter];

    [center getNotificationSettingsWithCompletionHandler:^(UNNotificationSettings * _Nonnull settings) {
        BOOL granted = (settings.authorizationStatus == UNAuthorizationStatusAuthorized);

        NSDictionary *result = @{
            @"alert": @(granted),
            @"badge": @(granted),
            @"sound": @(granted)
        };
        resolve(result);
    }];
}

RCT_EXPORT_METHOD(getToken:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    // In a real app, this would get the APNS token
    // For now, return a mock token
    NSString *mockToken = [NSString stringWithFormat:@"mock_apns_token_%ld", (long)[[NSDate date] timeIntervalSince1970]];
    resolve(mockToken);
}

RCT_EXPORT_METHOD(displayNotification:(NSDictionary *)options
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    dispatch_async(dispatch_get_main_queue(), ^{
        NSString *title = options[@"title"] ?: @"SillyChat";
        NSString *body = options[@"body"] ?: @"";
        NSDictionary *data = options[@"data"];
        NSArray *actions = options[@"actions"];

        UNMutableNotificationContent *content = [[UNMutableNotificationContent alloc] init];
        content.title = title;
        content.body = body;
        content.sound = [UNNotificationSound defaultSound];

        if (data) {
            content.userInfo = data;
        }

        // Configure actions if provided
        if (actions && actions.count > 0) {
            NSMutableArray *notificationActions = [NSMutableArray array];

            for (NSDictionary *action in actions) {
                NSString *actionId = action[@"id"];
                NSString *actionTitle = action[@"title"];

                if (actionId && actionTitle) {
                    UNNotificationAction *notificationAction = [UNNotificationAction
                        actionWithIdentifier:actionId
                                     title:actionTitle
                                   options:UNNotificationActionOptionForeground];
                    [notificationActions addObject:notificationAction];
                }
            }

            if (notificationActions.count > 0) {
                NSString *categoryId = @"SILLYCHAT_NOTIFICATION_CATEGORY";
                UNNotificationCategory *category = [UNNotificationCategory
                    categoryWithIdentifier:categoryId
                                   actions:notificationActions
                         intentIdentifiers:@[]
                                   options:UNNotificationCategoryOptionNone];

                NSSet *categories = [NSSet setWithObject:category];
                [[UNUserNotificationCenter currentNotificationCenter] setNotificationCategories:categories];

                content.categoryIdentifier = categoryId;
            }
        }

        // Create trigger for immediate notification
        UNTimeIntervalNotificationTrigger *trigger = [UNTimeIntervalNotificationTrigger
            triggerWithTimeInterval:0.1
                            repeats:NO];

        NSString *identifier = [NSString stringWithFormat:@"sillychat_notification_%ld", (long)[[NSDate date] timeIntervalSince1970]];
        UNNotificationRequest *request = [UNNotificationRequest
            requestWithIdentifier:identifier
                          content:content
                          trigger:trigger];

        [[UNUserNotificationCenter currentNotificationCenter] addNotificationRequest:request
                                                               withCompletionHandler:^(NSError * _Nullable error) {
            if (error) {
                reject(@"DISPLAY_ERROR", @"Failed to display notification", error);
                return;
            }

            NSDictionary *result = @{
                @"notificationId": identifier,
                @"success": @YES
            };
            resolve(result);
        }];
    });
}

RCT_EXPORT_METHOD(cancelNotification:(NSString *)notificationId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    UNUserNotificationCenter *center = [UNUserNotificationCenter currentNotificationCenter];
    [center removeDeliveredNotificationsWithIdentifiers:@[notificationId]];
    [center removePendingNotificationRequestsWithIdentifiers:@[notificationId]];
    resolve(@YES);
}

RCT_EXPORT_METHOD(cancelAllNotifications:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    UNUserNotificationCenter *center = [UNUserNotificationCenter currentNotificationCenter];
    [center removeAllDeliveredNotifications];
    [center removeAllPendingNotificationRequests];
    resolve(@YES);
}

#pragma mark - UNUserNotificationCenterDelegate

- (void)userNotificationCenter:(UNUserNotificationCenter *)center
       willPresentNotification:(UNNotification *)notification
         withCompletionHandler:(void (^)(UNNotificationPresentationOptions))completionHandler {
    // Handle foreground notification
    NSDictionary *userInfo = notification.request.content.userInfo;

    [self sendEventWithName:EVENT_NOTIFICATION_RECEIVED
                       body:@{
                           @"title": notification.request.content.title,
                           @"body": notification.request.content.body,
                           @"data": userInfo ?: @{},
                           @"foreground": @YES
                       }];

    completionHandler(UNNotificationPresentationOptionAlert |
                     UNNotificationPresentationOptionBadge |
                     UNNotificationPresentationOptionSound);
}

- (void)userNotificationCenter:(UNUserNotificationCenter *)center
didReceiveNotificationResponse:(UNNotificationResponse *)response
         withCompletionHandler:(void (^)(void))completionHandler {
    // Handle notification tap
    NSString *actionIdentifier = response.actionIdentifier;
    UNNotification *notification = response.notification;
    NSDictionary *userInfo = notification.request.content.userInfo;

    NSMutableDictionary *eventBody = [@{
        @"notificationId": notification.request.identifier,
        @"data": userInfo ?: @{},
        @"actionId": actionIdentifier
    } mutableCopy];

    if ([actionIdentifier isEqualToString:UNNotificationDefaultActionIdentifier]) {
        [eventBody removeObjectForKey:@"actionId"];
    }

    [self sendEventWithName:EVENT_NOTIFICATION_OPENED body:eventBody];

    completionHandler();
}

@end
