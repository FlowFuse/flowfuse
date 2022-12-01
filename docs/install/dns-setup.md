# DNS Setup

When running FlowForge on Docker or Kubernetes you will need to be able to setup an entry in a DNS server.

This is because FlowForge uses hostname based routing to know which project you want to access.

By default the project name is used in combination with a supplied domain. In this document I will use `example.com` as the domain. (It doesn't need to be a "whole" domain, it could also be a sub domain of one you already own. e.g. `ff.example.com`).

Because DNS is all about mapping hostnames to IP addresses (and vice versa) I will be using the `192.168.0.22` IPv4 address to represent the host machine running Docker, or one of the nodes in the Kubernates cluster running the Ingress Controller.

If you are running Docker/Kubernetes on the same machine as the DNS server and Web Browser do not use `127.0.0.1` as the IP address to point the wild card domain at. This is because the host names will be looked up by the Web Browser, the Forge Application, and the Project Node-RED instances. The last 2 are running in containers and `127.0.0.1` will resolve to the container, not the entry point. 

For Docker on Linux you can use `172.17.0.1` which is the IP address assigned to the `docker0` interface.

On MacOS you can alias a private IP address to the loop back interface e.g. `10.128.0.1` with `sudo ifconfig lo0 alias10.128.0.1`

## Production

For a production deployment you will need to talk to who ever owns your DNS infrastructure.

As mentioned earlier you will need them to create a wild card entry that points to either the Docker host machine or the Kubernetes Nodes that are run the Ingress Controller.

This can be either:

- a `A` (and `AAAA` for IPv6) record pointing to an IP address
- a `CNAME` record pointing to the hostname of the entry point.

## Local Testing and Development

For development and testing we probably only need to set up DNS entries for the developers local machine. The easiest way to do this is to use an application called dnsmasq.

Dnsmasq is a tool that can be used as a DNS caching proxy (and a DHCP server, but we don't need that). We can set it up to point to an up stream DNS server to resolve all normal addresses, but we can can also give it a list of hostname/IP address pairs to use locally.

### DNSMasq

Setting up dnsmasq is not too complicated, what is harder is setting it up in a way that works well with the network configuration on a laptop that might move between different networks and expects to get it's default DNS configuration automatically assigned by DHCP.

The following headings cover how to do this on a number of different operating systems

#### Ubuntu

```
sudo apt-get install dnsmasq
sudo echo "no-resolv" >> /etc/dnsmasq.conf
sudo echo "server=127.0.0.53" >> /etc/dnsmasq.conf
sudo echo "address=/example.com/192.168.0.22" > /etc/dnsmasq.d/02-flowforge.conf

```

(TBC)

#### Fedora

(TBC)

```
sudo dnf install dnsmasq
```

#### MacOS

On MacOS you will need install dnsmasq using homebrew

```
brew install dnsmasq
```

It appears that the install location differs based on the Apple Hardware. For Intel hardware Macs it's in `/usr/local` and for M1 hardware it's `/opt/homebrew`. Please check where it installed things when the previous command has completed.

Then edit a configuration file 

M1 mac
```
echo "conf-d=/opt/homebrew/etc/dnsmasq.d" >> /opt/homebrew/etc/dnsmasq.conf
echo "address=/example.com/192.168.0.22" > /opt/homebrew/etc/dnsmasq.d/ff.conf
```

Intel mac
```
echo "conf-d=/usr/local/etc/dnsmasq.d" >> /usr/local/etc/dnsmasq.conf
echo "address=/example.com/192.168.0.22" > /usr/local/etc/dnsmasq.d/ff.conf
```

Set dnsmasq to run as a service

```
sudo cp $(brew list dnsmasq | grep /homebrew.mxcl.dnsmasq.plist$) /Library/LaunchDaemons/
sudo launchctl unload /Library/LaunchDaemons/homebrew.mxcl.dnsmasq.plist
sudo launchctl load /Library/LaunchDaemons/homebrew.mxcl.dnsmasq.plist
dscacheutil -flushcache
```

Tell MacOS to use dnsmasq for our test domain

```
sudo mkdir -p /etc/resolver
sudo tee /etc/resolver/example.com > /dev/null <<EOF
nameserver 127.0.0.1
domain example.com
search_order 1
EOF
```

And finally kick the MacOS resolver so it sees the updates

```
sudo killall -HUP mDNSResponder
```

### Pi Hole

Pi Hole is a package that bundles dnsmasq as an image to run on a Raspberry Pi (or in Docker container e.g. on your NAS). It's main use is to block advertisements embedded in web pages. But since in it's normal configuration it is already handling all the local DNS traffic, making us work with FlowForge is possible and means you do not need to change any settings on your development/test machine.

Create the following file in `/etc/dnsmasq.d` called `02-flowforge.conf`

```
address=/example.com/192.168.0.22
```

Again where `example.com` is the domain to use and `192.168.0.22` is the IPv4 address of the docker host machine or a Kubernetes node.

After making the change you will probably need to restart things with:

```
sudo pihole restartdns
```

If running Pi Hole in Docker then you will need to create the file on the host and mount it to the `/etc/dnsmasq.d/02-flowforge.conf` location.

### No Local DNS server

If you really can't run dnsmasq then there is a possible alternative.

You can set the domain FlowForge uses to the following pattern `192.168.0.22.sslip.io`

This works because the `sslip.io` domain is setup to always return the IP address embedded in the hostname queried.