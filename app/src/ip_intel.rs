use crate::config::GeoIpConfig;
use maxminddb::{geoip2, Reader};
use std::{
    collections::HashMap,
    net::IpAddr,
    path::Path,
    sync::Arc,
};
use tokio::sync::RwLock;

#[derive(Debug, Clone, Default)]
pub struct IpGeoRecord {
    pub country: Option<String>,
    pub country_code: Option<String>,
    pub region: Option<String>,
    pub city: Option<String>,
    pub timezone: Option<String>,
    pub asn: Option<String>,
    pub asn_org: Option<String>,
    pub isp: Option<String>,
    pub is_proxy: bool,
    pub is_vpn: bool,
    pub is_tor: bool,
    pub is_datacenter: bool,
}

#[derive(Debug, Clone)]
pub struct IpIntelService {
    enabled: bool,
    database_path: String,
    reader: Option<Arc<Reader<Vec<u8>>>>,
    cache: Arc<RwLock<HashMap<String, Option<IpGeoRecord>>>>,
}

impl IpIntelService {
    pub fn new(config: &GeoIpConfig) -> Self {
        let reader = if config.enabled {
            match Reader::open_readfile(Path::new(&config.database_path)) {
                Ok(reader) => Some(Arc::new(reader)),
                Err(error) => {
                    eprintln!(
                        "geoip disabled: failed to open MMDB at {}: {error}",
                        config.database_path
                    );
                    None
                }
            }
        } else {
            None
        };

        Self {
            enabled: config.enabled && reader.is_some(),
            database_path: config.database_path.clone(),
            reader,
            cache: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub fn is_enabled(&self) -> bool {
        self.enabled
    }

    pub fn database_path(&self) -> &str {
        &self.database_path
    }

    pub async fn lookup(&self, ip: &str) -> Option<IpGeoRecord> {
        if !self.enabled || !is_public_ip(ip) {
            return None;
        }

        if let Some(cached) = self.cache.read().await.get(ip).cloned() {
            return cached;
        }

        let fetched = self.fetch(ip);
        self.cache
            .write()
            .await
            .insert(ip.to_string(), fetched.clone());
        fetched
    }

    fn fetch(&self, ip: &str) -> Option<IpGeoRecord> {
        let ip_addr = ip.parse::<IpAddr>().ok()?;
        let reader = self.reader.as_ref()?;
        let result = reader.lookup(ip_addr).ok()?;
        let city = result.decode::<geoip2::City<'_>>().ok()??;

        let country = city.country.names.english.map(ToString::to_string);
        let country_code = city.country.iso_code.map(ToString::to_string);
        let region = city
            .subdivisions
            .first()
            .and_then(|item| item.names.english)
            .map(ToString::to_string);
        let city_name = city.city.names.english.map(ToString::to_string);
        let timezone = city.location.time_zone.map(ToString::to_string);

        Some(IpGeoRecord {
            country,
            country_code,
            region,
            city: city_name,
            timezone,
            asn: None,
            asn_org: None,
            isp: None,
            is_proxy: false,
            is_vpn: false,
            is_tor: false,
            is_datacenter: false,
        })
    }
}

fn is_public_ip(value: &str) -> bool {
    match value.parse::<IpAddr>() {
        Ok(IpAddr::V4(ip)) => {
            !(ip.is_private()
                || ip.is_loopback()
                || ip.is_link_local()
                || ip.is_broadcast()
                || ip.is_multicast()
                || ip.is_unspecified()
                || is_ipv4_documentation(ip))
        }
        Ok(IpAddr::V6(ip)) => {
            !(ip.is_loopback()
                || ip.is_unspecified()
                || ip.is_unique_local()
                || ip.is_unicast_link_local()
                || ip.is_multicast()
                || is_ipv6_documentation(ip))
        }
        Err(_) => false,
    }
}

fn is_ipv4_documentation(ip: std::net::Ipv4Addr) -> bool {
    let octets = ip.octets();
    matches!(
        octets,
        [192, 0, 2, _] | [198, 51, 100, _] | [203, 0, 113, _]
    )
}

fn is_ipv6_documentation(ip: std::net::Ipv6Addr) -> bool {
    let segments = ip.segments();
    segments[0] == 0x2001 && segments[1] == 0x0db8
}
