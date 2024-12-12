# Cloud-Based Python Code Compiling Environment

This repository contains the implementation of a **Cloud-Based Python Code Compiling Environment**. 

The project simulates a cloud infrastructure to compile Python code efficiently, providing features like:
- User login and authentication.
- Dynamic resource scaling using virtualization.
- Python code compilation and execution, focusing on applications in machine learning, computer vision, and deep learning.
- Real-time monitoring of resource usage (e.g., memory, CPU utilization).

The project is developed using **KVM** and **Ubuntu Server**, leveraging virtualization to create a scalable and efficient coding environment.

---

## Table of Contents
1. [Overview](#overview)
2. [Features](#features)
3. [Technologies Used](#technologies-used)
4. [Setup Instructions](#setup-instructions)
5. [Usage](#usage)
6. [Contributors](#contributors)
7. [License](#license)

---

## Overview
This project is a part of the **CSE540 Cloud Computing** course. It aims to provide a practical demonstration of how cloud environments can be designed and utilized for Python-based software development. The infrastructure is built from scratch using two physical machines to emulate the cloud, with a focus on backend logic and scalability rather than the user interface.

## Setup Instructions

### Step 1: Installing KVM on a Fresh Operating System

1. **Update the System**: Ensure your OS is up to date.
    ```bash
    sudo apt update && sudo apt upgrade -y
    ```

2. **Install KVM and Required Packages**:
    ```bash
    sudo apt install -y qemu-kvm libvirt-daemon-system libvirt-clients bridge-utils virt-manager
    ```

3. **Verify KVM Installation**: Check if your system supports virtualization:
    ```bash
    egrep -c '(vmx|svm)' /proc/cpuinfo
    ```
    Output should be 1 or higher. Then, verify the kvm modules:
    ```bash
    lsmod | grep kvm
    ```

4. **Add User to the KVM Group**: Add your current user to the libvirt and kvm groups for permission to manage virtual machines.
    ```bash
    sudo usermod -aG libvirt,kvm $(whoami)
    ```

5. **Reboot the System**: Apply changes.
    ```bash
    sudo reboot
    ```

### Step 2: Creating a Lightweight Ubuntu VM

1. **Download an Ubuntu ISO**: Download the minimal Ubuntu Server ISO from Ubuntu's Official Website.

2. **Create a Virtual Machine**:
    - Open Virt-Manager:
      ```bash
      virt-manager
      ```
    - Create a new VM:
      - Choose Local install media.
      - Select the downloaded Ubuntu ISO.
      - Allocate resources:
        - RAM: 512 MB - 2 GB (depending on your use case).
        - CPU: 1-2 cores.
      - Create a virtual disk: 8-20 GB, depending on the requirements.
      - Follow the Ubuntu installation steps to complete the setup.

3. **Install Guest Utilities (Optional but Recommended)**: Inside the VM, install tools for better performance:
    ```bash
    sudo apt install qemu-guest-agent
    ```

### Step 3: Setting Up Network Connections

1. **Configure Network Bridge**:
    - Edit the Netplan configuration file on the host machine:
      ```bash
      sudo nano /etc/netplan/01-netcfg.yaml
      ```
    - Example configuration:
      ```yaml
      network:
        version: 2
        renderer: networkd
        ethernets:
          enp0s3:
            dhcp4: no
        bridges:
          br0:
            interfaces: [enp0s3]
            dhcp4: yes
      ```
    - Apply the changes:
      ```bash
      sudo netplan apply
      ```

2. **Connect the VM to the Bridge**:
    - In Virt-Manager, edit the VM settings:
      - Change the network interface to use the br0 bridge.

3. **Test the Connection**: Inside the VM, ensure the network is working:
    ```bash
    ping google.com
    ```

### Step 4: Cloning and Configuring Multiple VMs

1. **Clone the Base VM**: Use Virt-Manager to clone the base Ubuntu VM to create additional VMs.

2. **Modify Hostnames and IP Addresses**:
    - Inside each VM, update the hostname:
      ```bash
      sudo hostnamectl set-hostname <new-hostname>
      ```
    - Set static IP addresses if needed via Netplan.

3. **Verify Communication**: Ensure the VMs can communicate with each other and the host using ping or ssh.

