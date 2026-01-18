"""
Rate limiter implementation for API requests
Tracks requests per minute and per day per client
"""
from datetime import datetime, timedelta
from typing import Dict, List
from collections import defaultdict

class RateLimiter:
    """
    Rate limiter that enforces requests per minute and per day limits.
    Uses sliding window approach for accurate rate limiting.
    """
    
    def __init__(self, requests_per_minute: int = 15, requests_per_day: int = 500):
        self.requests_per_minute = requests_per_minute
        self.requests_per_day = requests_per_day
        
        # Store request timestamps per client
        # Format: {client_id: [datetime, ...]}
        self.minute_requests: Dict[str, List[datetime]] = defaultdict(list)
        self.day_requests: Dict[str, List[datetime]] = defaultdict(list)
    
    def _clean_old_requests(self, client_id: str):
        """Remove requests older than the relevant time windows"""
        now = datetime.now()
        
        # Clean minute requests (older than 1 minute)
        minute_cutoff = now - timedelta(minutes=1)
        self.minute_requests[client_id] = [
            req_time for req_time in self.minute_requests[client_id]
            if req_time > minute_cutoff
        ]
        
        # Clean day requests (older than 24 hours)
        day_cutoff = now - timedelta(days=1)
        self.day_requests[client_id] = [
            req_time for req_time in self.day_requests[client_id]
            if req_time > day_cutoff
        ]
    
    def check_rate_limit(self, client_id: str) -> bool:
        """
        Check if client can make a request.
        Returns True if allowed, False if rate limited.
        """
        self._clean_old_requests(client_id)
        
        now = datetime.now()
        
        # Check minute limit
        if len(self.minute_requests[client_id]) >= self.requests_per_minute:
            return False
        
        # Check day limit
        if len(self.day_requests[client_id]) >= self.requests_per_day:
            return False
        
        # Record this request
        self.minute_requests[client_id].append(now)
        self.day_requests[client_id].append(now)
        
        return True
