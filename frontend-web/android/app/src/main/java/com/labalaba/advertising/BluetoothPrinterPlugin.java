package com.labalaba.advertising;

import android.Manifest;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothSocket;
import android.util.Base64;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.PermissionState;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import java.io.OutputStream;
import java.util.UUID;

@CapacitorPlugin(
    name = "BluetoothPrinter",
    permissions = {
        @Permission(strings = { Manifest.permission.BLUETOOTH_CONNECT }, alias = "bluetooth")
    }
)
public class BluetoothPrinterPlugin extends Plugin {
    private static final UUID SPP_UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");

    @PluginMethod
    public void printRaw(PluginCall call) {
        if (getPermissionState("bluetooth") != PermissionState.GRANTED) {
            requestPermissionForAlias("bluetooth", call, "printPermsCallback");
            return;
        }
        doPrint(call);
    }

    @PermissionCallback
    private void printPermsCallback(PluginCall call) {
        if (getPermissionState("bluetooth") == PermissionState.GRANTED) {
            doPrint(call);
        } else {
            call.reject("Izin Bluetooth ditolak");
        }
    }

    private void doPrint(PluginCall call) {
        final String address = call.getString("address");
        final String base64Data = call.getString("data");

        if (address == null || base64Data == null) {
            call.reject("Parameter address atau data tidak ada");
            return;
        }

        new Thread(() -> {
            BluetoothSocket sock = null;
            try {
                byte[] data = Base64.decode(base64Data, Base64.DEFAULT);
                BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
                if (adapter == null) {
                    call.reject("Bluetooth tidak didukung pada perangkat ini");
                    return;
                }
                if (!adapter.isEnabled()) {
                    call.reject("Bluetooth tidak aktif");
                    return;
                }

                BluetoothDevice device = adapter.getRemoteDevice(address);
                sock = device.createRfcommSocketToServiceRecord(SPP_UUID);
                adapter.cancelDiscovery();
                sock.connect();

                OutputStream os = sock.getOutputStream();
                os.write(data);
                os.flush();
                Thread.sleep(300);

                JSObject ret = new JSObject();
                ret.put("success", true);
                call.resolve(ret);
            } catch (Exception e) {
                call.reject("Gagal print: " + e.getMessage(), e);
            } finally {
                try {
                    if (sock != null) sock.close();
                } catch (Exception ignored) {}
            }
        }).start();
    }

    @PluginMethod
    public void isBluetoothEnabled(PluginCall call) {
        BluetoothAdapter adapter = BluetoothAdapter.getDefaultAdapter();
        JSObject ret = new JSObject();
        ret.put("enabled", adapter != null && adapter.isEnabled());
        call.resolve(ret);
    }
}
