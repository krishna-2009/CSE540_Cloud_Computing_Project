#!/bin/bash

# Parameters passed from the caller
VM_NAME="demovm1"
LOAD=90
OS_VARIANT="ubuntu20.04"
BRIDGE="br0"
ISO_LOCATION="http://archive.ubuntu.com/ubuntu/dists/focal/main/installer-amd64/"
DISK_PATH="/var/lib/libvirt/images/${VM_NAME}.img"

# Set default resources
RAM=2048  # 2GB by default
VCPUS=1    # 1 vCPU by default
DISK_SIZE=10  # 10GB disk by default

# Adjust resources based on load
if (( $(echo "$LOAD > 80" | bc -l) )); then
  RAM=4096   # 4GB
  VCPUS=2    # 2 vCPUs
  DISK_SIZE=20  # 20GB
fi

# Preseed file location (use a local path or HTTP server to host the file)
PRESEED_URL="/home/cloud-lab/Desktop/test folder/ubuntu_preseed.cfg"

# Create VM
echo "Creating VM: $VM_NAME with $RAM MB RAM, $VCPUS vCPUs, $DISK_SIZE GB disk"
virt-install \
  --name "$VM_NAME" \
  --ram "$RAM" \
  --vcpus "$VCPUS" \
  --disk path="$DISK_PATH",size="$DISK_SIZE" \
  --os-variant "$OS_VARIANT" \
  --network bridge="$BRIDGE",model=virtio \
  --graphics none \
  --console pty,target_type=serial \
  --location "$ISO_LOCATION" \
  --extra-args "auto=true file=http://<YOUR_PC_IP>:8000/preseed.cfg priority=critical console=ttyS0,115200n8 serial"


# Confirm
if [ $? -eq 0 ]; then
    echo "VM $VM_NAME created successfully."
else
    echo "Failed to create VM $VM_NAME."
    exit 1
fi

