use anyhow::Result;
use http::{HeaderMap, StatusCode};
use ingress_core::{CanonicalRequestContext, Decision, RequestContext};

#[derive(Debug, Clone)]
pub enum GatewayInput {
    Request(RequestContext),
}

#[derive(Debug, Clone)]
pub struct GatewayResponse {
    pub status: StatusCode,
    pub headers: HeaderMap,
}

impl GatewayResponse {
    pub fn new(status: StatusCode) -> Self {
        Self {
            status,
            headers: HeaderMap::new(),
        }
    }
}

pub trait GatewayAdapter {
    fn normalize_request(&self, input: GatewayInput) -> Result<CanonicalRequestContext>;
    fn to_gateway_response(&self, decision: &Decision) -> Result<GatewayResponse>;
}
