# Cloud-Based Python Code Compiling Environment

This repository contains the implementation of a **Cloud-Based Python Code Compiling Environment**. 

The project simulates a cloud infrastructure to compile Python code efficiently, providing features like:
- Get the username.
- Dynamic resource scaling using virtualization.
- Python code compilation and execution, focusing on applications in machine learning, computer vision, and deep learning.
- Indirect Resouce Management via Job Distribution.

The project is developed using **KVM**, **Docker**, and **Ubuntu Server**, leveraging virtualization to create a scalable and efficient coding environment.

---

## Table of Contents
1. [Overview](#overview)
2. [Features](#features)
3. [Technologies Used](#technologies-used)
4. [Setup Instructions](#setup-instructions)
5. [Usage](#usage)
6. [Important Files](#important-files)
7. [Contributors](#contributors)
8. [License](#license)

---

## Overview

This project is a part of the **CSE540 Cloud Computing** course. It aims to provide a practical demonstration of how cloud environments can be designed and utilized for Python-based ML and DL codes . The infrastructure is built from scratch using two physical machines to emulate the cloud, with a focus on backend logic and scalability rather than the user interface.

## Features

- **User Authentication**: Secure login system for users.
- **Dynamic Resource Scaling**: Automatically scale resources using virtualization.
- **Python Code Compilation and Execution**: Compile and execute Python code, especially for machine learning, computer vision, and deep learning applications.
- **Job Scheduling**: Indirect Resouce Management via Job Distribution.

## Technologies Used

- **Ubuntu Server**
- **KVM (Kernel-based Virtual Machine)**
- **Docker**
- **Ubuntu Server**
- **Node.js**
- **Express.js**
- **Multer**
- **Axios**

## Setup Instructions

### Prerequisites

- Two physical or virtual machines running Ubuntu Server.
- Basic knowledge of Linux command-line operations.
- Internet connection to download necessary packages.

### Step 1: Installing KVM on a Fresh Operating System

1. **Update the System**: Ensure your OS is up to date.
    ```bash
    sudo apt update && sudo apt upgrade -y
    ```

2. **Install KVM and Required Packages**:
    ```bash
    sudo apt install -y qemu-kvm libvirt-daemon-system libvirt-clients bridge-utils virt-manager
    ```

3. **Verify KVM Installation**:
    ```bash
    egrep -c '(vmx|svm)' /proc/cpuinfo
    ```
    Output should be 1 or higher. Then, verify the KVM modules:
    ```bash
    lsmod | grep kvm
    ```

4. **Add User to the KVM Group**: Add your current user to the `libvirt` and `kvm` groups for permission to manage virtual machines.
    ```bash
    sudo usermod -aG libvirt,kvm $(whoami)
    ```

5. **Reboot the System**: Apply changes.
    ```bash
    sudo reboot
    ```

### Step 2: Creating a Lightweight Ubuntu VM

1. **Download an Ubuntu ISO**: Download the minimal Ubuntu Server ISO from Ubuntu's official website.

2. **Create a Virtual Machine**:

    - Open Virt-Manager:
      ```bash
      virt-manager
      ```
    - Create a new VM:
      - Choose **Local install media**.
      - Select the downloaded Ubuntu ISO.
      - Allocate resources:
        - **RAM**: 1 GB.
        - **CPU**: 1 core.
      - Create a virtual disk: 10 GB.
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
      - Change the network interface to use the `br0` bridge.

3. **Test the Connection**: Inside the VM, ensure the network is working:
    ```bash
    ping google.com
    ```

### Step 4: Cloning and Configuring Multiple VMs

1. **Clone the Base VM**: Use Virt-Manager to clone the base Ubuntu VM to create additional VMs (worker nodes).

2. **Modify Hostnames and IP Addresses**:

    - Inside each VM, update the hostname:
      ```bash
      sudo hostnamectl set-hostname <new-hostname>
      ```
    - Set static IP addresses if needed via Netplan.

3. **Verify Communication**: Ensure the VMs can communicate with each other and the host using `ping` or `ssh`.

### Step 5: Installing Docker and Running a Simple Containerized Application

1. **Update Package Index**:
    ```bash
    sudo apt-get update
    ```

2. **Install Required Packages**:
    ```bash
    sudo apt-get install -y \
        ca-certificates \
        curl \
        gnupg \
        lsb-release
    ```

3. **Add Docker’s Official GPG Key**:
    ```bash
    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    ```

4. **Set Up the Docker Repository**:
    ```bash
    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    ```

5. **Install Docker**:
    ```bash
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    ```

6. **Check Docker Version**: Verify that Docker is installed correctly:
    ```bash
    docker --version
    ```

7. **Run the Test Container**: Go to  Docker terminal for library installation.:
    ```bash
    sudo docker run -it ubuntu bash
    ```

8. **Add User to Docker Group**: To allow running Docker commands without `sudo`, add the current user to the Docker group:
    ```bash
    sudo usermod -aG docker $USER
    ```
    Log out and log back in to apply the changes.

### Step 6: Setting Up Node.js Environment

1. **Install Node.js (Version 16)**:

    - Install Node.js v16.x:
      ```bash
      curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
      sudo apt-get install -y nodejs
      ```
    - Verify the installation:
      ```bash
      node -v
      npm -v
      ```

### Step 7: Cloning the Project Repository

1. **Clone the Repository**:
    ```bash
    git clone https://github.com/your-username/Cloud-Computing-CSE540-Project.git
    cd Cloud-Computing-CSE540-Project
    ```

2. **Install Project Dependencies**:
    ```bash
    npm install
    ```

### Step 8: Running the Application

#### On the Proxy Server Machine:

1. **Start the Proxy Server**:
    ```bash
    node server.js
    ```
    The proxy server listens at `http://<proxy-server-ip>:3000`.

#### On Each Worker Node Machine:

1. **Start the Worker Node**:
    ```bash
    node worker-node.js
    ```
    Each worker node listens on `port 3001` and registers itself with the proxy server.

### Step 9: Testing the Application

1. **Access the Proxy Server Interface**:

    - Open a web browser and navigate to:
      ```
      http://<proxy-server-ip>:3000/
      ```

2. **Upload a Python Script**:

    - Use the form to upload your Python script and optionally a dataset (ZIP file).

3. **Check Job Status**:

    - Monitor the status of your job at:
      ```
      http://<proxy-server-ip>:3000/job-status/<YourUserName>
      ```

## Usage

- **Submitting Jobs**: Users can submit their Python scripts through the proxy server's web interface.
- **Job Processing**: The proxy server distributes jobs to available worker nodes in a round-robin fashion.
- **Job Output**: Once the job is processed, the output is sent back to the proxy server, and users can retrieve their results.

## Important Files

### `server.js`

This is the proxy server that manages job requests and distributes them to available worker nodes.

```javascript
// filepath: /home/krishna/Downloads/cloud/Project/Cloud-Computing-CSE540-Project/server.js
// ...existing code...
```

### `worker-node.js`

This is the worker node script that processes the jobs sent by the proxy server.

```javascript
// filepath: /home/krishna/Downloads/cloud/Project/Cloud-Computing-CSE540-Project/worker-node.js
// ...existing code...
```

### `ubuntu_preseed.cfg`

This is the preseed configuration file for automating Ubuntu installations.

```properties
// filepath: /home/krishna/Downloads/cloud/Project/Cloud-Computing-CSE540-Project/VM Creation/ubuntu_preseed.cfg
// ...existing code...
```

## Additional Notes

- **Dockerfile Example**: To test Docker functionality, create a simple Python script and Dockerfile.

  **Create `test.py`**:
  ```python
  # filepath: /path/to/your/project/test.py
  print("Hello from Docker!")
  ```

  **Create `Dockerfile`**:
  ```dockerfile
  # filepath: /path/to/your/project/Dockerfile
  FROM python:3.8
  COPY test.py /app/test.py
  WORKDIR /app
  CMD ["python", "test.py"]
  ```

  **Build the Docker Image**:
  ```bash
  docker build -t test-python .
  ```

  **Run the Docker Container**:
  ```bash
  docker run --rm test-python
  ```
  You should see:
  ```
  Hello from Docker!
  ```

- **Ensure Node.js Version Compatibility**: The application requires Node.js version 16. Please make sure you have the correct version installed.

## Contributors
- **[Krishna Patel](https://github.com/krishna-2009)** , **[Harsh Loriya](https://github.com/LoriyaHarsh)**, **[Priyam Shah](https://github.com/Priyam932004)**, **[Krutarth Trivedi](https://github.com/)**.

## License

This project is licensed under the MIT License.



