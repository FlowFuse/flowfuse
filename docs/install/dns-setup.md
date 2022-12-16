# DNS Setup

When running FlowForge on Docker or Kubernetes you will need to be able to setup an entry in a DNS server.

This is because FlowForge uses hostname based routing to know which project you want to access.

By default the project name is used in combination with a supplied domain. In this document I will use `example.com` as the domain. (It doesn't need to be a "whole" domain, it could also be a sub domain of one you already own. e.g. `ff.example.com`).

If you are running Docker/Kubernetes on the same machine as the DNS server and Web Browser do not use `127.0.0.1` as the IP address to point the wild card domain at. This is because the host names will be looked up by the Web Browser, the Forge Application, and the Project Node-RED instances. The last 2 are running in containers and `127.0.0.1` will resolve to the container, not the entry point. 

## Production

For a production deployment you will need to have access to modify DNS, if you are not sure how to set up DNS records talk to whoever manages your DNS.

As mentioned earlier you will need them to create a wild card entry that points to either the Docker host machine or the Kubernetes Nodes which are running the Ingress Controller.

This can be either:

- a `A` (and `AAAA` for IPv6) record pointing to an IP address
- a `CNAME` record pointing to the hostname of the entry point.

### AWS ALB Ingress

When using AWS ALB (Application Load Balancer) as an Ingress Controller for FlowForge deployed into an EKS cluster then you would create a wildcard CNAME entry pointing to the hostname of the ALB

### Digital Ocean 

You should create an A record pointing to the public IP address of the Load Balancer created when you install the Nginx Ingress Helm Chart.

## Local Testing and Development

For development and testing we probably only need to set up DNS entries for the developers local machine. The easiest way to do this is to use an application called dnsmasq.

Dnsmasq is a tool that can be used as a DNS caching proxy (and a DHCP server, but we don't need that). We can set it up to point to an upstream DNS server to resolve all normal addresses, but we can also give it a list of hostname/IP address pairs to use locally.

### DNSMasq

Setting up dnsmasq is not too complex, what is harder is setting it up in a way that works well with the network configuration on a laptop that might move between different networks and expects to get its default DNS configuration automatically assigned by DHCP.

The following headings cover how to do this on a number of different operating systems

#### Ubuntu

For Docker on Linux you can use `172.17.0.1` as the address for the domain which is the IP address assigned to the `docker0` interface.

```bash
sudo apt-get install dnsmasq
sudo echo "bind-interfaces" >> /etc/dnsmasq.conf
sudo echo "no-resolv" >> /etc/dnsmasq.conf
sudo echo "conf-dir=/etc/dnsmasq.d" >> /etc/dnsmasq.conf
sudo echo "address=/example.com/172.17.0.1" > /etc/dnsmasq.d/02-flowforge.conf
sudo service dnsmasq restart
sudo echo "DNS=127.0.0.1" >> /etc/systemd/resolved.conf
sudo echo "DOMAINS=~example.com" >> /etc/systemd/resolved.conf
sudo service systemd-resolved restart
```

#### Fedora

For Docker on Linux you can use `172.17.0.1` as the address for the domain which is the IP address assigned to the `docker0` interface.


```bash
sudo dnf install dnsmasq
sudo echo "bind-interfaces" >> /etc/dnsmasq.conf
sudo echo "no-resolv" >> /etc/dnsmasq.conf
sudo echo "conf-dir=/etc/dnsmasq.d" >> /etc/dnsmasq.conf
sudo echo "address=/example.com/172.17.0.1" > /etc/dnsmasq.d/02-flowforge.conf
sudo systemctl enable dnsmasq.service
sudo service dnsmasq restart
sudo echo "DNS=127.0.0.1" >> /etc/systemd/resolved.conf
sudo echo "DOMAINS=~example.com" >> /etc/systemd/resolved.conf
sudo service systemd-resolved restart
```

#### Windows

Unfortunately dnsmasq will not run on Windows and I have not found something similar yet.

#### MacOS

On MacOS you can alias a private IP address to the loop back interface e.g. `10.128.0.1` with

```bash
sudo ifconfig lo0 alias 10.128.0.1
```

You will need install dnsmasq using [homebrew](https://docs.brew.sh/Installation)

```bash
brew install dnsmasq
```

It appears that the install location differs based on the Apple Hardware. For Intel hardware Macs it's in `/usr/local` and for M1 hardware it's `/opt/homebrew`. Please check where it installed things when the previous command has completed.

Then edit a configuration file 

M1 mac
```bash
echo "conf-dir=/opt/homebrew/etc/dnsmasq.d" >> /opt/homebrew/etc/dnsmasq.conf
echo "address=/example.com/10.128.0.1" > /opt/homebrew/etc/dnsmasq.d/ff.conf
```

Intel mac
```bash
echo "conf-dir=/usr/local/etc/dnsmasq.d" >> /usr/local/etc/dnsmasq.conf
echo "address=/example.com/10.128.0.1" > /usr/local/etc/dnsmasq.d/ff.conf
```

Set dnsmasq to run as a service

```bash
sudo brew services start dnsmasq
sudo dscacheutil -flushcache
```

Tell MacOS to use dnsmasq for our test domain

```bash
sudo mkdir -p /etc/resolver
sudo tee /etc/resolver/example.com > /dev/null <<EOF
nameserver 127.0.0.1
domain example.com
search_order 1
EOF
```

And finally kick the MacOS resolver so it sees the updates

```bash
sudo killall -HUP mDNSResponder
```

### Pi Hole

Pi Hole is a package that bundles dnsmasq as an image to run on a Raspberry Pi (or in Docker container e.g. on your NAS). Its main use is to block advertisements embedded in web pages. But since in its normal configuration it is already handling all the local DNS traffic, making us work with FlowForge is possible and means you do not need to change any settings on your development/test machine.

Create the following file in `/etc/dnsmasq.d` called `02-flowforge.conf`

```bash
address=/example.com/192.168.0.22
```

Where 192.168.0.22 is the ipv4 address of the Docker host machine or a Kubernetes node. And `example.com` is the domain to use.

After making the change you will probably need to restart things with:

```bash
sudo pihole restartdns
```

If running Pi Hole in Docker then you will need to create the file on the host and mount it to the `/etc/dnsmasq.d/02-flowforge.conf` location.

### No Local DNS server

If you really can't run dnsmasq then there is a possible alternative.

A really useful service called sslip.io allows you to test FlowForge even when you cannot use dnsmasq. You can read more about [sslip.io on their web site](https://sslip.io).

You will need to set the `domain` entry in the `flowforge.yml` configuration file to the following pattern `172.17.0.1.sslip.io`. Don't forget to replace the IP address with the correct one for your configuration.

This will work because the `sslip.io` domain is set up to always return the IP address embedded in the hostname queried. 
