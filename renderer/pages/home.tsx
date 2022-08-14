import { Switch } from '@headlessui/react';
import { useQuery } from '@tanstack/react-query';
import { validate } from 'bitcoin-address-validation';
import clsx from 'clsx';
import { Dispenser } from 'counterparty-node-client';
import { shell } from 'electron';
import { ErrorMessage, Field, Form, Formik } from 'formik';
import Head from 'next/head';
import React, { PropsWithChildren, useCallback } from 'react';
import { Counterparty } from '../modules/lib/Counterparty';
import { useDispenserAddresses } from '../modules/lib/stores/dispenserAddresses';
import { useShowClosedDispensers } from '../modules/lib/stores/showClosedAddresses';

const cp = new Counterparty();

function Home() {
  const [dispenserAddresses, setDispenserAddresses] = useDispenserAddresses();
  const deleteAddress = useCallback(
    (dispenserAddress: string) => {
      const newAddresses = dispenserAddresses.filter((disp) => disp !== dispenserAddress);
      setDispenserAddresses(newAddresses);
    },
    [dispenserAddresses, setDispenserAddresses]
  );

  return (
    <>
      <Head>
        <title>Dispenser Tracker</title>
      </Head>
      <div className="flex justify-end py-4 px-8">
        <div className="flex flex-col">
          <p className="text-center text-sm">Closed Dispensers</p>
          <ClosedDispenserSwitch />
        </div>
      </div>
      <div className="flex flex-col gap-y-32 p-8">
        {!!dispenserAddresses.length && (
          <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-x-8 gap-y-16">
            {dispenserAddresses.map((d) => (
              <Address dispenserAddress={d} key={d} onDeleteClick={deleteAddress} />
            ))}
          </div>
        )}
        <div>
          Enter a dispenser address:
          <Formik
            initialValues={{ dispenserAddress: '' }}
            onSubmit={({ dispenserAddress }, { resetForm, setFieldError }) => {
              if (dispenserAddresses.includes(dispenserAddress)) {
                return setFieldError(
                  'dispenserAddress',
                  'Address already in your list of dispensers'
                );
              }

              if (!validate(dispenserAddress)) {
                return setFieldError('dispenserAddress', 'Address is not a valid Bitcoin address');
              }
              setDispenserAddresses([...dispenserAddresses, dispenserAddress]);
              resetForm();
            }}
          >
            <Form className="flex flex-col gap-y-2">
              <Field
                className="border border-gray-700 p-2 rounded-sm w-96"
                name="dispenserAddress"
              />
              <ErrorMessage component={CustomError} name="dispenserAddress" />
              <button className="bg-purple-500 text-purple-100 p-4 rounded-md" type="submit">
                Add Address
              </button>
            </Form>
          </Formik>
        </div>
      </div>
    </>
  );
}

const CustomError: React.FC<PropsWithChildren<unknown>> = ({ children }) => {
  return <span className="block text-xs text-red-800 my-0">{children}</span>;
};

const Address: React.FC<{
  dispenserAddress: string;
  onDeleteClick: (d: string) => void;
}> = ({ dispenserAddress, onDeleteClick }) => {
  const { data: balance } = useQuery(
    ['balance', dispenserAddress],
    async () => {
      const resp = await fetch(`https://mempool.space/api/address/${dispenserAddress}/utxo`);
      const json: { value: number }[] = await resp.json();
      return json.reduce((acc, utxo) => acc + utxo.value, 0);
    },
    {
      cacheTime: 30 * 60 * 1_000,
      refetchOnMount: false,
      refetchOnWindowFocus: false,
      // @ts-expect-error
      staleTime: `Infinity`,
    }
  );

  const { data: dispensers } = useQuery(['dispenser', dispenserAddress], ({ queryKey }) => {
    const [_, dispenserAddress] = queryKey;
    if (dispenserAddress) {
      return cp.getDispenserByAddresses([dispenserAddress]);
    }
  });

  const [showClosedDispensers] = useShowClosedDispensers();

  const dispensersToDisplay = dispensers?.filter(
    (d) => showClosedDispensers || !isDispenserClosed(d)
  );

  if (!dispensersToDisplay?.length) return null;

  return (
    <div className="flex flex-col">
      <div className="flex gap-x-8">
        <div>
          <button
            className="text-pink-500 hover:text-pink-700"
            onClick={() => shell.openExternal(`https://xchain.io/address/${dispenserAddress}`)}
          >
            {dispenserAddress}
          </button>
          {typeof balance === 'number' && <p>Balance: {balance.toLocaleString()} sats</p>}
        </div>
        <button onClick={() => onDeleteClick(dispenserAddress)} type="button">
          Delete
        </button>
      </div>
      {dispensersToDisplay.map((d) => (
        <div
          className="odd:bg-green-400 even:bg-green-100 flex flex-col gap-y-1 p-2"
          key={d.tx_hash}
        >
          <button
            className="text-pink-500 hover:text-pink-700 text-left break-all"
            onClick={() => shell.openExternal(`https://xchain.io/tx/${d.tx_hash}`)}
          >
            Dispenser: {d.tx_hash}
          </button>
          <p>
            Asset:{' '}
            <button
              className="text-pink-500 hover:text-pink-700"
              onClick={() => shell.openExternal(`https://xchain.io/asset/${d.asset}`)}
            >
              {d.asset}
            </button>
          </p>
          <p>Escrowed: {d.escrow_quantity.toLocaleString()}</p>
          <p>Remaining: {d.give_remaining.toLocaleString()}</p>
          <p>Rate: {d.satoshirate.toLocaleString()} sats</p>
          <p>Status: {isDispenserClosed(d) ? 'closed' : 'open'}</p>
        </div>
      ))}
    </div>
  );
};

const ClosedDispenserSwitch: React.FC = () => {
  const [showClosedDispensers, setShowClosedDispensers] = useShowClosedDispensers();

  return (
    <div className="flex items-end text-xs space-x-4">
      <p>Hide</p>
      <Switch
        checked={!showClosedDispensers}
        onChange={() => setShowClosedDispensers(!showClosedDispensers)}
        className={clsx(
          showClosedDispensers ? 'bg-teal-900' : 'bg-teal-700',
          'relative inline-flex h-6 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2  focus-visible:ring-white focus-visible:ring-opacity-75'
        )}
      >
        <span
          className={clsx(
            showClosedDispensers && 'translate-x-6',
            'inline-block h-5 w-5 transform rounded-full bg-white transition ease-in-out duration-200'
          )}
        />
      </Switch>
      <p>Show</p>
    </div>
  );
};

const isDispenserClosed = (dispenser: Pick<Dispenser, 'status'>) => {
  return dispenser.status === 10;
};

export default Home;
