use ingress_core::{CanonicalRequestContext, Decision};

pub trait PolicyEngine {
    fn evaluate(&self, request: &CanonicalRequestContext) -> Decision;
}

#[derive(Debug, Default)]
pub struct AllowAllPolicy;

impl PolicyEngine for AllowAllPolicy {
    fn evaluate(&self, _request: &CanonicalRequestContext) -> Decision {
        Decision::allow("bootstrap.allow_all")
    }
}
