# NetworkPolicy Reviewer

## Summary

Review NetworkPolicy YAML for open egress, internet-wide ingress CIDRs, empty
pod selectors, missing policyTypes, and missing default-deny posture when workloads
are present in the same bundle.

## Route

`/tools/networkpolicy-reviewer`
