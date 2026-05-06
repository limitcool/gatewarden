use chrono::{DateTime, Duration, Utc};
use ingress_core::CanonicalRequestContext;
use std::collections::HashMap;

#[derive(Debug, Clone, PartialEq, Eq)]
pub enum RateLimitScope {
    Ip,
    User,
    Path,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RateLimitKey(String);

impl RateLimitKey {
    pub fn from_scope(scope: RateLimitScope, value: &str) -> Self {
        let prefix = match scope {
            RateLimitScope::Ip => "ip",
            RateLimitScope::User => "user",
            RateLimitScope::Path => "path",
        };
        Self(format!("{prefix}:{value}"))
    }

    pub fn as_str(&self) -> &str {
        &self.0
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RateLimitDescriptor {
    pub key: RateLimitKey,
    pub rps: u32,
    pub burst: u32,
}

impl RateLimitDescriptor {
    pub fn new(key: RateLimitKey, rps: u32, burst: u32) -> Self {
        Self { key, rps, burst }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RateLimitRule {
    pub id: String,
    pub scope: RateLimitScope,
    pub path_prefix: String,
    pub rps: u32,
    pub burst: u32,
}

impl RateLimitRule {
    pub fn matches(&self, request: &CanonicalRequestContext) -> bool {
        request.normalized_path.starts_with(&self.path_prefix)
    }

    pub fn key_for(&self, request: &CanonicalRequestContext) -> RateLimitKey {
        match self.scope {
            RateLimitScope::Ip => {
                RateLimitKey::from_scope(RateLimitScope::Ip, &request.client_ip.to_string())
            }
            RateLimitScope::User => {
                let subject = request
                    .auth
                    .subject_id
                    .as_deref()
                    .unwrap_or("anonymous");
                RateLimitKey::from_scope(RateLimitScope::User, subject)
            }
            RateLimitScope::Path => {
                RateLimitKey::from_scope(RateLimitScope::Path, &request.normalized_path)
            }
        }
    }
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct RateLimitSnapshot {
    pub exceeded: bool,
    pub remaining: u32,
    pub reset_at: DateTime<Utc>,
}

#[derive(Debug, Clone)]
struct BucketState {
    tokens: f64,
    last_refill_at: DateTime<Utc>,
}

#[derive(Debug, Default)]
pub struct InMemoryRateLimiter {
    buckets: HashMap<String, BucketState>,
}

impl InMemoryRateLimiter {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn check(
        &mut self,
        descriptor: &RateLimitDescriptor,
        now: DateTime<Utc>,
    ) -> RateLimitSnapshot {
        let key = descriptor.key.as_str().to_string();
        let refill_per_second = f64::from(descriptor.rps.max(1));
        let burst = f64::from(descriptor.burst.max(1));
        let state = self.buckets.entry(key).or_insert_with(|| BucketState {
            tokens: burst,
            last_refill_at: now,
        });

        let elapsed = now
            .signed_duration_since(state.last_refill_at)
            .num_milliseconds()
            .max(0) as f64
            / 1000.0;
        state.tokens = (state.tokens + (elapsed * refill_per_second)).min(burst);
        state.last_refill_at = now;

        if state.tokens >= 1.0 {
            state.tokens -= 1.0;
            return RateLimitSnapshot {
                exceeded: false,
                remaining: state.tokens.floor() as u32,
                reset_at: now + Duration::seconds(1),
            };
        }

        let needed = 1.0 - state.tokens;
        let wait_seconds = needed / refill_per_second;
        let wait_millis = (wait_seconds * 1000.0).ceil() as i64;

        RateLimitSnapshot {
            exceeded: true,
            remaining: 0,
            reset_at: now + Duration::milliseconds(wait_millis.max(1)),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::TimeDelta;

    #[test]
    fn token_bucket_allows_within_burst_and_then_limits() {
        let mut limiter = InMemoryRateLimiter::new();
        let descriptor = RateLimitDescriptor::new(
            RateLimitKey::from_scope(RateLimitScope::Ip, "127.0.0.1"),
            1,
            2,
        );
        let now = Utc::now();

        let first = limiter.check(&descriptor, now);
        let second = limiter.check(&descriptor, now);
        let third = limiter.check(&descriptor, now);

        assert!(!first.exceeded);
        assert!(!second.exceeded);
        assert!(third.exceeded);
        assert_eq!(third.remaining, 0);
    }

    #[test]
    fn token_bucket_refills_after_time_passes() {
        let mut limiter = InMemoryRateLimiter::new();
        let descriptor = RateLimitDescriptor::new(
            RateLimitKey::from_scope(RateLimitScope::User, "alice"),
            1,
            1,
        );
        let now = Utc::now();

        let first = limiter.check(&descriptor, now);
        let second = limiter.check(&descriptor, now);
        let third = limiter.check(&descriptor, now + TimeDelta::seconds(1));

        assert!(!first.exceeded);
        assert!(second.exceeded);
        assert!(!third.exceeded);
    }
}
