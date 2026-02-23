#import <React/RCTBridgeModule.h>
#import <LocalAuthentication/LocalAuthentication.h>

@interface BiometricModule : NSObject <RCTBridgeModule>
@end

@implementation BiometricModule

static NSString *const ERROR_CODE_CANCELED = @"USER_CANCELED";
static NSString *const ERROR_CODE_NOT_AVAILABLE = @"NOT_AVAILABLE";
static NSString *const ERROR_CODE_NOT_ENROLLED = @"NOT_ENROLLED";
static NSString *const ERROR_CODE_LOCKOUT = @"LOCKOUT";
static NSString *const ERROR_CODE_AUTHENTICATION_FAILED = @"AUTHENTICATION_FAILED";

// Biometric types
static const NSInteger BIOMETRIC_TYPE_FINGERPRINT = 1;
static const NSInteger BIOMETRIC_TYPE_FACE = 2;
static const NSInteger BIOMETRIC_TYPE_IRIS = 4;

RCT_EXPORT_MODULE(BiometricModule);

+ (BOOL)requiresMainQueueSetup {
    return YES;
}

- (NSDictionary *)constantsToExport {
    return @{
        @"BIOMETRIC_TYPE_FINGERPRINT": @(BIOMETRIC_TYPE_FINGERPRINT),
        @"BIOMETRIC_TYPE_FACE": @(BIOMETRIC_TYPE_FACE),
        @"BIOMETRIC_TYPE_IRIS": @(BIOMETRIC_TYPE_IRIS),
        @"ERROR_CODE_CANCELED": ERROR_CODE_CANCELED,
        @"ERROR_CODE_NOT_AVAILABLE": ERROR_CODE_NOT_AVAILABLE,
        @"ERROR_CODE_NOT_ENROLLED": ERROR_CODE_NOT_ENROLLED,
        @"ERROR_CODE_LOCKOUT": ERROR_CODE_LOCKOUT,
        @"ERROR_CODE_AUTHENTICATION_FAILED": ERROR_CODE_AUTHENTICATION_FAILED
    };
}

#pragma mark - Sensor Availability

RCT_EXPORT_METHOD(isSensorAvailable:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    LAContext *context = [[LAContext alloc] init];
    NSError *error = nil;

    // Check for biometric availability
    BOOL canEvaluateBiometric = [context canEvaluatePolicy:LAPolicyDeviceOwnerAuthenticationWithBiometrics error:&error];

    // Check for device credential availability
    BOOL canEvaluateDeviceCredential = [context canEvaluatePolicy:LAPolicyDeviceOwnerAuthentication error:&error];

    NSMutableDictionary *result = [@{
        @"available": @(canEvaluateBiometric),
        @"deviceCredential": @(canEvaluateDeviceCredential),
        @"strongBiometric": @(canEvaluateBiometric),
        @"weakBiometric": @(canEvaluateBiometric)
    } mutableCopy];

    // Determine biometry type
    if (canEvaluateBiometric) {
        NSString *biometryType = [self getBiometryType:context];
        result[@"biometryType"] = biometryType;
    } else {
        result[@"biometryType"] = @"None";
        if (error) {
            result[@"error"] = [self getErrorMessage:error];
        }
    }

    resolve(result);
}

RCT_EXPORT_METHOD(getBiometryType:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    LAContext *context = [[LAContext alloc] init];
    NSError *error = nil;

    BOOL canEvaluate = [context canEvaluatePolicy:LAPolicyDeviceOwnerAuthenticationWithBiometrics error:&error];

    if (canEvaluate) {
        resolve([self getBiometryType:context]);
    } else {
        resolve(@"None");
    }
}

#pragma mark - Authentication

RCT_EXPORT_METHOD(simplePrompt:(NSDictionary *)params
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    dispatch_async(dispatch_get_main_queue(), ^{
        LAContext *context = [[LAContext alloc] init];
        NSError *error = nil;

        NSString *title = params[@"title"] ?: @"Authentication Required";
        NSString *subtitle = params[@"subtitle"] ?: @"";
        NSString *cancelButtonText = params[@"cancelButtonText"] ?: @"Cancel";
        NSNumber *fallbackToDeviceCredentials = params[@"fallbackToDeviceCredentials"] ?: @NO;

        // Check if biometric is available
        BOOL canEvaluate = [context canEvaluatePolicy:LAPolicyDeviceOwnerAuthenticationWithBiometrics error:&error];

        if (!canEvaluate) {
            // If fallback to device credentials is enabled, try that
            if ([fallbackToDeviceCredentials boolValue]) {
                [self authenticateWithDeviceCredential:params resolver:resolve rejecter:reject];
                return;
            }

            resolve(@{
                @"success": @NO,
                @"error": [self getErrorCode:error],
                @"errorMessage": [self getErrorMessage:error],
                @"errorCode": @(error ? error.code : -1)
            });
            return;
        }

        // Configure localized cancel title
        context.localizedCancelTitle = cancelButtonText;

        [context evaluatePolicy:LAPolicyDeviceOwnerAuthenticationWithBiometrics
                localizedReason:subtitle
                          reply:^(BOOL success, NSError * _Nullable error) {
            dispatch_async(dispatch_get_main_queue(), ^{
                if (success) {
                    resolve(@{
                        @"success": @YES,
                        @"message": @"Authentication successful",
                        @"authenticationType": [self getBiometryType:context]
                    });
                } else {
                    resolve(@{
                        @"success": @NO,
                        @"error": [self getErrorCode:error],
                        @"errorMessage": [self getErrorMessage:error],
                        @"errorCode": @(error ? error.code : -1)
                    });
                }
            });
        }];
    });
}

RCT_EXPORT_METHOD(authenticateWithDeviceCredential:(NSDictionary *)params
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject) {
    dispatch_async(dispatch_get_main_queue(), ^{
        LAContext *context = [[LAContext alloc] init];
        NSError *error = nil;

        NSString *title = params[@"title"] ?: @"Authentication Required";
        NSString *subtitle = params[@"subtitle"] ?: @"";
        NSString *cancelButtonText = params[@"cancelButtonText"] ?: @"Cancel";

        // Check if device credential authentication is available
        BOOL canEvaluate = [context canEvaluatePolicy:LAPolicyDeviceOwnerAuthentication error:&error];

        if (!canEvaluate) {
            resolve(@{
                @"success": @NO,
                @"error": [self getErrorCode:error],
                @"errorMessage": [self getErrorMessage:error],
                @"errorCode": @(error ? error.code : -1)
            });
            return;
        }

        // Configure localized cancel title
        context.localizedCancelTitle = cancelButtonText;

        [context evaluatePolicy:LAPolicyDeviceOwnerAuthentication
                localizedReason:subtitle
                          reply:^(BOOL success, NSError * _Nullable error) {
            dispatch_async(dispatch_get_main_queue(), ^{
                if (success) {
                    resolve(@{
                        @"success": @YES,
                        @"message": @"Authentication successful",
                        @"authenticationType": @"deviceCredential"
                    });
                } else {
                    resolve(@{
                        @"success": @NO,
                        @"error": [self getErrorCode:error],
                        @"errorMessage": [self getErrorMessage:error],
                        @"errorCode": @(error ? error.code : -1)
                    });
                }
            });
        }];
    });
}

#pragma mark - Helper Methods

- (NSString *)getBiometryType:(LAContext *)context {
    if (@available(iOS 11.0, *)) {
        switch (context.biometryType) {
            case LABiometryTypeFaceID:
                return @"FaceID";
            case LABiometryTypeTouchID:
                return @"TouchID";
            default:
                return @"None";
        }
    } else {
        // Before iOS 11, only TouchID was available
        return @"TouchID";
    }
}

- (NSString *)getErrorCode:(NSError *)error {
    if (!error) {
        return ERROR_CODE_AUTHENTICATION_FAILED;
    }

    switch (error.code) {
        case LAErrorUserCancel:
        case LAErrorAppCancel:
        case LAErrorSystemCancel:
            return ERROR_CODE_CANCELED;
        case LAErrorBiometryNotAvailable:
        case LAErrorBiometryNotEnrolled:
            return ERROR_CODE_NOT_ENROLLED;
        case LAErrorBiometryLockout:
            return ERROR_CODE_LOCKOUT;
        case LAErrorPasscodeNotSet:
            return ERROR_CODE_NOT_AVAILABLE;
        default:
            return ERROR_CODE_AUTHENTICATION_FAILED;
    }
}

- (NSString *)getErrorMessage:(NSError *)error {
    if (!error) {
        return @"Authentication failed";
    }

    switch (error.code) {
        case LAErrorUserCancel:
        case LAErrorAppCancel:
        case LAErrorSystemCancel:
            return @"User canceled authentication";
        case LAErrorBiometryNotAvailable:
            return @"Biometric authentication not available";
        case LAErrorBiometryNotEnrolled:
            return @"No biometric credentials enrolled";
        case LAErrorBiometryLockout:
            return @"Biometric authentication is locked out";
        case LAErrorPasscodeNotSet:
            return @"Passcode is not set";
        case LAErrorInvalidContext:
            return @"Invalid authentication context";
        case LAErrorNotInteractive:
            return @"Authentication requires user interaction";
        default:
            return error.localizedDescription ?: @"Authentication failed";
    }
}

@end
