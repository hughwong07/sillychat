#import <React/RCTBridgeModule.h>
#import <React/RCTUtils.h>
#import <LocalAuthentication/LocalAuthentication.h>
#import <Security/Security.h>

static NSString *const kServiceName = @"com.sillychat.storage";
static NSString *const kBiometricKeyPrefix = @"biometric_";

@interface StorageModule : NSObject <RCTBridgeModule>
@end

@implementation StorageModule

RCT_EXPORT_MODULE(StorageModule);

+ (BOOL)requiresMainQueueSetup {
    return NO;
}

#pragma mark - Basic Storage Methods

RCT_EXPORT_METHOD(setItem:(NSString *)key
                  value:(NSString *)value
                  useEncryption:(BOOL)useEncryption
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
        @try {
            NSMutableDictionary *query = [@{
                (__bridge id)kSecClass: (__bridge id)kSecClassGenericPassword,
                (__bridge id)kSecAttrService: kServiceName,
                (__bridge id)kSecAttrAccount: key,
            } mutableCopy];

            // Delete existing item first
            SecItemDelete((__bridge CFDictionaryRef)query);

            NSData *dataToStore;
            if (useEncryption) {
                // Use Keychain's built-in encryption
                query[(__bridge id)kSecAttrAccessible] = (__bridge id)kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly;
                dataToStore = [value dataUsingEncoding:NSUTF8StringEncoding];
            } else {
                query[(__bridge id)kSecAttrAccessible] = (__bridge id)kSecAttrAccessibleAfterFirstUnlock;
                dataToStore = [value dataUsingEncoding:NSUTF8StringEncoding];
            }

            query[(__bridge id)kSecValueData] = dataToStore;

            OSStatus status = SecItemAdd((__bridge CFDictionaryRef)query, NULL);

            dispatch_async(dispatch_get_main_queue(), ^{
                if (status == errSecSuccess) {
                    resolve([NSNull null]);
                } else {
                    reject(@"STORAGE_ERROR", [NSString stringWithFormat:@"Failed to store item: %d", (int)status], nil);
                }
            });
        } @catch (NSException *exception) {
            dispatch_async(dispatch_get_main_queue(), ^{
                reject(@"STORAGE_ERROR", exception.reason, nil);
            });
        }
    });
}

RCT_EXPORT_METHOD(getItem:(NSString *)key
                  useEncryption:(BOOL)useEncryption
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
        @try {
            NSDictionary *query = @{
                (__bridge id)kSecClass: (__bridge id)kSecClassGenericPassword,
                (__bridge id)kSecAttrService: kServiceName,
                (__bridge id)kSecAttrAccount: key,
                (__bridge id)kSecReturnData: @YES,
                (__bridge id)kSecMatchLimit: (__bridge id)kSecMatchLimitOne,
            };

            CFDataRef dataRef = NULL;
            OSStatus status = SecItemCopyMatching((__bridge CFDictionaryRef)query, (CFTypeRef *)&dataRef);

            dispatch_async(dispatch_get_main_queue(), ^{
                if (status == errSecSuccess && dataRef != NULL) {
                    NSData *data = (__bridge_transfer NSData *)dataRef;
                    NSString *value = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
                    resolve(value);
                } else if (status == errSecItemNotFound) {
                    resolve([NSNull null]);
                } else {
                    reject(@"RETRIEVAL_ERROR", [NSString stringWithFormat:@"Failed to retrieve item: %d", (int)status], nil);
                }
            });
        } @catch (NSException *exception) {
            dispatch_async(dispatch_get_main_queue(), ^{
                reject(@"RETRIEVAL_ERROR", exception.reason, nil);
            });
        }
    });
}

RCT_EXPORT_METHOD(removeItem:(NSString *)key
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
        @try {
            NSDictionary *query = @{
                (__bridge id)kSecClass: (__bridge id)kSecClassGenericPassword,
                (__bridge id)kSecAttrService: kServiceName,
                (__bridge id)kSecAttrAccount: key,
            };

            OSStatus status = SecItemDelete((__bridge CFDictionaryRef)query);

            dispatch_async(dispatch_get_main_queue(), ^{
                if (status == errSecSuccess || status == errSecItemNotFound) {
                    resolve(@YES);
                } else {
                    reject(@"REMOVE_ERROR", [NSString stringWithFormat:@"Failed to remove item: %d", (int)status], nil);
                }
            });
        } @catch (NSException *exception) {
            dispatch_async(dispatch_get_main_queue(), ^{
                reject(@"REMOVE_ERROR", exception.reason, nil);
            });
        }
    });
}

RCT_EXPORT_METHOD(clear:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
        @try {
            NSDictionary *query = @{
                (__bridge id)kSecClass: (__bridge id)kSecClassGenericPassword,
                (__bridge id)kSecAttrService: kServiceName,
            };

            OSStatus status = SecItemDelete((__bridge CFDictionaryRef)query);

            dispatch_async(dispatch_get_main_queue(), ^{
                if (status == errSecSuccess || status == errSecItemNotFound) {
                    resolve(@YES);
                } else {
                    reject(@"CLEAR_ERROR", [NSString stringWithFormat:@"Failed to clear storage: %d", (int)status], nil);
                }
            });
        } @catch (NSException *exception) {
            dispatch_async(dispatch_get_main_queue(), ^{
                reject(@"CLEAR_ERROR", exception.reason, nil);
            });
        }
    });
}

RCT_EXPORT_METHOD(getAllKeys:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
        @try {
            NSDictionary *query = @{
                (__bridge id)kSecClass: (__bridge id)kSecClassGenericPassword,
                (__bridge id)kSecAttrService: kServiceName,
                (__bridge id)kSecReturnAttributes: @YES,
                (__bridge id)kSecMatchLimit: (__bridge id)kSecMatchLimitAll,
            };

            CFArrayRef resultsRef = NULL;
            OSStatus status = SecItemCopyMatching((__bridge CFDictionaryRef)query, (CFTypeRef *)&resultsRef);

            dispatch_async(dispatch_get_main_queue(), ^{
                if (status == errSecSuccess && resultsRef != NULL) {
                    NSArray *results = (__bridge_transfer NSArray *)resultsRef;
                    NSMutableArray *keys = [NSMutableArray array];

                    for (NSDictionary *item in results) {
                        NSString *account = item[(__bridge id)kSecAttrAccount];
                        if (account) {
                            [keys addObject:account];
                        }
                    }

                    resolve(keys);
                } else if (status == errSecItemNotFound) {
                    resolve(@[]);
                } else {
                    reject(@"GET_KEYS_ERROR", [NSString stringWithFormat:@"Failed to get keys: %d", (int)status], nil);
                }
            });
        } @catch (NSException *exception) {
            dispatch_async(dispatch_get_main_queue(), ^{
                reject(@"GET_KEYS_ERROR", exception.reason, nil);
            });
        }
    });
}

#pragma mark - Biometric Protected Storage

RCT_EXPORT_METHOD(setItemWithBiometric:(NSString *)key
                  value:(NSString *)value
                  promptTitle:(NSString *)promptTitle
                  promptSubtitle:(NSString *)promptSubtitle
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    dispatch_async(dispatch_get_main_queue(), ^{
        @try {
            LAContext *context = [[LAContext alloc] init];
            NSError *error = nil;

            if (![context canEvaluatePolicy:LAPolicyDeviceOwnerAuthenticationWithBiometrics error:&error]) {
                reject(@"BIOMETRIC_ERROR", error ? error.localizedDescription : @"Biometric authentication not available", nil);
                return;
            }

            [context evaluatePolicy:LAPolicyDeviceOwnerAuthenticationWithBiometrics
                    localizedReason:promptSubtitle
                              reply:^(BOOL success, NSError * _Nullable error) {
                if (success) {
                    dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
                        @try {
                            NSString *biometricKey = [kBiometricKeyPrefix stringByAppendingString:key];

                            NSMutableDictionary *query = [@{
                                (__bridge id)kSecClass: (__bridge id)kSecClassGenericPassword,
                                (__bridge id)kSecAttrService: kServiceName,
                                (__bridge id)kSecAttrAccount: biometricKey,
                            } mutableCopy];

                            SecItemDelete((__bridge CFDictionaryRef)query);

                            query[(__bridge id)kSecValueData] = [value dataUsingEncoding:NSUTF8StringEncoding];
                            query[(__bridge id)kSecAttrAccessible] = (__bridge id)kSecAttrAccessibleWhenUnlockedThisDeviceOnly;
                            query[(__bridge id)kSecUseAuthenticationContext] = context;

                            OSStatus status = SecItemAdd((__bridge CFDictionaryRef)query, NULL);

                            dispatch_async(dispatch_get_main_queue(), ^{
                                if (status == errSecSuccess) {
                                    resolve([NSNull null]);
                                } else {
                                    reject(@"STORAGE_ERROR", [NSString stringWithFormat:@"Failed to store with biometric: %d", (int)status], nil);
                                }
                            });
                        } @catch (NSException *exception) {
                            dispatch_async(dispatch_get_main_queue(), ^{
                                reject(@"STORAGE_ERROR", exception.reason, nil);
                            });
                        }
                    });
                } else {
                    reject(@"AUTH_FAILED", error ? error.localizedDescription : @"Biometric authentication failed", nil);
                }
            }];
        } @catch (NSException *exception) {
            reject(@"BIOMETRIC_SETUP_ERROR", exception.reason, nil);
        }
    });
}

RCT_EXPORT_METHOD(getItemWithBiometric:(NSString *)key
                  promptTitle:(NSString *)promptTitle
                  promptSubtitle:(NSString *)promptSubtitle
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    dispatch_async(dispatch_get_main_queue(), ^{
        @try {
            LAContext *context = [[LAContext alloc] init];
            NSError *error = nil;

            if (![context canEvaluatePolicy:LAPolicyDeviceOwnerAuthenticationWithBiometrics error:&error]) {
                reject(@"BIOMETRIC_ERROR", error ? error.localizedDescription : @"Biometric authentication not available", nil);
                return;
            }

            [context evaluatePolicy:LAPolicyDeviceOwnerAuthenticationWithBiometrics
                    localizedReason:promptSubtitle
                              reply:^(BOOL success, NSError * _Nullable error) {
                if (success) {
                    dispatch_async(dispatch_get_global_queue(DISPATCH_QUEUE_PRIORITY_DEFAULT, 0), ^{
                        @try {
                            NSString *biometricKey = [kBiometricKeyPrefix stringByAppendingString:key];

                            NSDictionary *query = @{
                                (__bridge id)kSecClass: (__bridge id)kSecClassGenericPassword,
                                (__bridge id)kSecAttrService: kServiceName,
                                (__bridge id)kSecAttrAccount: biometricKey,
                                (__bridge id)kSecReturnData: @YES,
                                (__bridge id)kSecMatchLimit: (__bridge id)kSecMatchLimitOne,
                                (__bridge id)kSecUseAuthenticationContext: context,
                            };

                            CFDataRef dataRef = NULL;
                            OSStatus status = SecItemCopyMatching((__bridge CFDictionaryRef)query, (CFTypeRef *)&dataRef);

                            dispatch_async(dispatch_get_main_queue(), ^{
                                if (status == errSecSuccess && dataRef != NULL) {
                                    NSData *data = (__bridge_transfer NSData *)dataRef;
                                    NSString *value = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
                                    resolve(value);
                                } else if (status == errSecItemNotFound) {
                                    resolve([NSNull null]);
                                } else {
                                    reject(@"RETRIEVAL_ERROR", [NSString stringWithFormat:@"Failed to retrieve with biometric: %d", (int)status], nil);
                                }
                            });
                        } @catch (NSException *exception) {
                            dispatch_async(dispatch_get_main_queue(), ^{
                                reject(@"RETRIEVAL_ERROR", exception.reason, nil);
                            });
                        }
                    });
                } else {
                    reject(@"AUTH_FAILED", error ? error.localizedDescription : @"Biometric authentication failed", nil);
                }
            }];
        } @catch (NSException *exception) {
            reject(@"BIOMETRIC_SETUP_ERROR", exception.reason, nil);
        }
    });
}

@end
